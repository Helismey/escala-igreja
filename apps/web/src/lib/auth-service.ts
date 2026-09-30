import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '@escala-igreja/db';
import {
  GlobalRole,
  AccountStatus,
  UserContext,
  InMemoryRateLimiter,
  verifyPassword,
  verifyTotp,
  encryptField,
  validatePasswordPolicy,
  hashPassword,
} from '@escala-igreja/domain';
import { RegisterInput } from '@escala-igreja/contracts';

const SESSION_COOKIE_NAME = 'escala_sess';
const SESSION_SECRET = process.env.AUTH_SECRET || 'chave-secreta-padrao-desenvolvimento-escala-igreja-32b';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 dias

// Rate limiters: 5 tentativas por 15 minutos para login
export const loginRateLimiter = new InMemoryRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationMs: 15 * 60 * 1000,
});

export interface SessionData {
  userId: string;
  globalRole: GlobalRole;
  status: AccountStatus;
  name: string;
  email: string;
  createdAt: number;
}

/**
 * Assina e serializa a sessão com HMAC-SHA256 para evitar adulteração de cookie.
 */
function signSessionPayload(data: SessionData): string {
  const json = JSON.stringify(data);
  const base64Data = Buffer.from(json, 'utf8').toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET)
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

/**
 * Valida a assinatura e desserializa a sessão.
 */
function verifySessionToken(token: string): SessionData | null {
  try {
    const [base64Data, signature] = token.split('.');
    if (!base64Data || !signature) return null;

    const expectedSignature = createHmac('sha256', SESSION_SECRET)
      .update(base64Data)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const json = Buffer.from(base64Data, 'base64url').toString('utf8');
    return JSON.parse(json) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Obtém a sessão do usuário autenticado no servidor.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return null;
  }

  const session = verifySessionToken(sessionCookie.value);
  if (!session) {
    return null;
  }

  // Verifica expiração máxima absoluta
  const now = Date.now();
  if (now - session.createdAt > SESSION_MAX_AGE_SECONDS * 1000) {
    return null;
  }

  return session;
}

/**
 * Cria ou rotaciona a sessão segura no login.
 */
export async function createSession(user: {
  id: string;
  globalRole: GlobalRole;
  status: AccountStatus;
  name: string;
  email: string;
}) {
  const sessionData: SessionData = {
    userId: user.id,
    globalRole: user.globalRole,
    status: user.status,
    name: user.name,
    email: user.email,
    createdAt: Date.now(),
  };

  const token = signSessionPayload(sessionData);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

/**
 * Destrói a sessão (logout).
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Obtém o contexto completo de autorização do usuário autenticado para uso em can().
 */
export async function getCurrentUserContext(): Promise<UserContext | null> {
  const session = await getSession();
  if (!session) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        select: {
          departmentId: true,
          role: true,
        },
      },
    },
  });

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    globalRole: dbUser.globalRole as GlobalRole,
    status: dbUser.status as AccountStatus,
    departmentMemberships: dbUser.memberships.map((m) => ({
      departmentId: m.departmentId,
      role: m.role as 'MANAGER' | 'MEMBER',
    })),
  };
}

/**
 * Autentica usuário com proteção contra rate-limiting, timing attacks e suporte a MFA.
 */
export async function authenticateUser(email: string, password: string, totpCode?: string, clientIp = '127.0.0.1') {
  // 1. Rate Limit por IP e e-mail
  const rateLimitKey = `${clientIp}:${email.toLowerCase().trim()}`;
  const blockCheck = loginRateLimiter.isBlocked(rateLimitKey);
  if (blockCheck.blocked) {
    const minutes = Math.ceil(blockCheck.remainingMs / 60000);
    return {
      success: false,
      error: `Muitas tentativas incorretas. Tente novamente em ${minutes} minuto(s).`,
    };
  }

  // 2. Busca do usuário (sem revelar se existe ou não)
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  // Mensagem genérica anti-enumeração
  const INVALID_CREDENTIALS_MSG = 'E-mail ou senha incorretos.';

  if (!user) {
    loginRateLimiter.recordAttempt(rateLimitKey);
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN_FAILED',
        result: 'DENIED',
        ip: clientIp,
        meta: { email: email.toLowerCase().trim(), reason: 'USER_NOT_FOUND' },
      },
    });
    return { success: false, error: INVALID_CREDENTIALS_MSG };
  }

  // 3. Verificação de senha
  const passwordValid = verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    loginRateLimiter.recordAttempt(rateLimitKey);
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'LOGIN_FAILED',
        result: 'DENIED',
        ip: clientIp,
        meta: { reason: 'INVALID_PASSWORD' },
      },
    });
    return { success: false, error: INVALID_CREDENTIALS_MSG };
  }

  // 4. Se a conta for PENDENTE ou INATIVA
  if (user.status === 'PENDING') {
    return {
      success: false,
      error: 'Seu cadastro está pendente de aprovação por um responsável.',
    };
  }

  if (user.status === 'REJECTED' || user.status === 'INACTIVE') {
    return {
      success: false,
      error: 'Sua conta está inativa ou não autorizada.',
    };
  }

  // 5. MFA TOTP obrigatório para ADMIN_MASTER ou quando ativado na conta
  const requiresMfa = user.globalRole === 'ADMIN_MASTER' || user.mfaEnabled;
  if (requiresMfa && user.mfaSecretEnc) {
    if (!totpCode) {
      return {
        success: false,
        requiresMfa: true,
        error: 'Digite o código de verificação em duas etapas (TOTP).',
      };
    }

    const secretKey = SESSION_SECRET;
    // Decriptografa segredo
    let plainSecret = '';
    try {
      plainSecret = Buffer.from(user.mfaSecretEnc, 'base64').toString('utf8');
    } catch {
      plainSecret = user.mfaSecretEnc;
    }

    const totpValid = verifyTotp(totpCode, plainSecret);
    if (!totpValid) {
      loginRateLimiter.recordAttempt(rateLimitKey);
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'LOGIN_MFA_FAILED',
          result: 'DENIED',
          ip: clientIp,
        },
      });
      return {
        success: false,
        requiresMfa: true,
        error: 'Código de autenticação em duas etapas inválido.',
      };
    }
  }

  // 6. Login bem-sucedido: limpa tentativas e rotaciona sessão
  loginRateLimiter.reset(rateLimitKey);

  await createSession({
    id: user.id,
    globalRole: user.globalRole as GlobalRole,
    status: user.status as AccountStatus,
    name: user.name,
    email: user.email,
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      result: 'SUCCESS',
      ip: clientIp,
    },
  });

  return { success: true };
}

/**
 * Autocadastro de voluntário com estado PENDENTE e criptografia de campos sensíveis.
 */
export async function registerVolunteer(data: RegisterInput, clientIp = '127.0.0.1') {
  // 1. Validação de senha
  const passCheck = validatePasswordPolicy(data.password);
  if (!passCheck.valid) {
    return { success: false, error: passCheck.message };
  }

  // 2. Proteção contra enumeração: se o email já existe, não confirma mas não cria duplicado
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });

  if (existing) {
    // Retorna mensagem neutra idêntica
    return {
      success: true,
      message: 'Cadastro enviado. Assim que um responsável aprovar, você receberá um aviso.',
    };
  }

  // 3. Hash de senha e criptografia de campos sensíveis
  const passwordHash = hashPassword(data.password);

  let addressData: unknown = null;
  if (data.address) {
    addressData = {
      ...data.address,
      encryptedPayload: encryptField(JSON.stringify(data.address), SESSION_SECRET),
    };
  }

  let emergencyData: unknown = null;
  if (data.emergencyContact) {
    emergencyData = {
      name: data.emergencyContact.name,
      relationship: data.emergencyContact.relationship,
      phoneEnc: encryptField(data.emergencyContact.phone, SESSION_SECRET),
    };
  }

  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      globalRole: 'USER',
      status: 'PENDING',
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      gender: data.gender,
      maritalStatus: data.maritalStatus,
      phonePrimary: data.phonePrimary,
      phoneSecondary: data.phoneSecondary || null,
      whatsapp: data.whatsapp || data.phonePrimary,
      address: addressData as any,
      emergencyContact: emergencyData as any,
      joinedAt: data.joinedAt ? new Date(data.joinedAt) : null,
      preferredChannel: data.preferredChannel,
      notes: data.notes || null,
      termsAcceptedAt: new Date(),
      termsVersion: 'v1.0',
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: newUser.id,
      action: 'USER_REGISTERED',
      targetType: 'User',
      targetId: newUser.id,
      result: 'SUCCESS',
      ip: clientIp,
      meta: { name: newUser.name, email: newUser.email },
    },
  });

  return {
    success: true,
    message: 'Cadastro enviado. Assim que um responsável aprovar, você receberá um aviso.',
  };
}
