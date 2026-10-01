import { NextResponse } from 'next/server';
import { loginSchema } from '@escala-igreja/contracts';
import { prisma } from '@escala-igreja/db';
import {
  authenticateUser,
  signSessionPayload,
  SessionData,
} from '@/lib/auth-service';

/**
 * Endpoint de emissão de Bearer Token seguro para aplicativos nativos e clientes mobile (Capacitor/App).
 * Respeita a Rule 09 (API com token além de cookie) e Rule 17 (tokens seguros).
 */
export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { email, password, totpCode } = parsed.data;

    // Autentica com toda a lógica de rate limiting, MFA e Argon2id já blindada em authenticateUser
    const authResult = await authenticateUser(email, password, totpCode, clientIp);

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
          requiresMfa: authResult.requiresMfa,
        },
        { status: 401 }
      );
    }

    // Busca dados do usuário autenticado para compor o Bearer token
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const sessionData: SessionData = {
      userId: user.id,
      globalRole: user.globalRole as any,
      status: user.status as any,
      name: user.name,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
      createdAt: Date.now(),
    };

    const token = signSessionPayload(sessionData);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao autenticar cliente mobile';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
