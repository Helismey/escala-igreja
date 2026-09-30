import { randomBytes, createHash } from 'crypto';

export interface ActionTokenPair {
  rawToken: string;
  tokenHash: string;
}

/**
 * Gera um token criptograficamente seguro de 32 bytes (64 caracteres hexadecimais)
 * e o seu respectivo hash SHA-256 para persistência segura em banco.
 */
export function generateActionToken(byteLength = 32): ActionTokenPair {
  const rawToken = randomBytes(byteLength).toString('hex');
  const tokenHash = hashActionToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Calcula o hash determinístico SHA-256 de um token bruto.
 */
export function hashActionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Verifica se a data de expiração já foi atingida em relação a uma data base.
 */
export function isActionTokenExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  const exp = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return now.getTime() >= exp.getTime();
}

export type TokenValidationFailureReason = 'EXPIRED' | 'ALREADY_USED';

export interface TokenValidationResult {
  valid: boolean;
  reason?: TokenValidationFailureReason;
}

/**
 * Avalia a usabilidade de um ActionToken com base no seu status de uso e data de expiração.
 */
export function isActionTokenValid(
  token: { usedAt: Date | string | null; expiresAt: Date | string },
  now: Date = new Date()
): TokenValidationResult {
  if (token.usedAt) {
    return { valid: false, reason: 'ALREADY_USED' };
  }

  if (isActionTokenExpired(token.expiresAt, now)) {
    return { valid: false, reason: 'EXPIRED' };
  }

  return { valid: true };
}

/**
 * Calcula a data de expiração de um token de confirmação.
 * Se o culto/evento ocorrer antes de `maxDays`, o token expira no início do culto.
 * Caso contrário, expira em `maxDays` dias a partir do momento da emissão.
 */
export function calculateTokenExpiration(
  slotStartsAt: Date | string,
  maxDays = 7,
  now: Date = new Date()
): Date {
  const startsAt = typeof slotStartsAt === 'string' ? new Date(slotStartsAt) : slotStartsAt;
  const maxExpiration = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

  if (startsAt.getTime() <= now.getTime()) {
    return now;
  }

  if (startsAt.getTime() < maxExpiration.getTime()) {
    return startsAt;
  }

  return maxExpiration;
}

export interface ConfirmationMessageParams {
  memberFirstName: string;
  churchName?: string;
  programTitle: string;
  departmentName: string;
  functionName?: string | null;
  startsAt: Date | string;
  confirmationUrl: string;
}

/**
 * Formata mensagem acolhedora em pt-BR para envio de lembrete/confirmação via WhatsApp ou E-mail.
 * Respeita a Regra 16 (dados mínimos necessários: nome, culto, data, hora, ministério e link).
 */
export function formatConfirmationMessage(params: ConfirmationMessageParams): string {
  const {
    memberFirstName,
    churchName,
    programTitle,
    departmentName,
    functionName,
    startsAt,
    confirmationUrl,
  } = params;

  const dateObj = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  const dataFormatada = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const horaFormatada = dateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const ministerioInfo = functionName ? `${departmentName} (${functionName})` : departmentName;
  const igrejaStr = churchName ? ` na ${churchName}` : '';

  return (
    `Olá, ${memberFirstName}! Você está escalado(a)${igrejaStr} para o ${programTitle} ` +
    `no ministério ${ministerioInfo} no dia ${dataFormatada} às ${horaFormatada}.\n\n` +
    `Por favor, confirme sua presença ou avise se não puder comparecer acessando o link:\n` +
    `${confirmationUrl}`
  );
}
