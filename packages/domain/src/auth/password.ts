import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Lista das senhas mais comuns no Brasil e no mundo para rejeição imediata
export const COMMON_PASSWORDS_BLACKLIST = new Set([
  '123456789012',
  '1234567890123',
  'password12345',
  'senha12345678',
  'igreja1234567',
  'jesus12345678',
  'deusefiel1234',
  'senhadificil12',
  'administrador1',
  'trocarsenha12',
]);

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Valida a política de senha conforme a regra de segurança 10:
 * Mínimo 12 caracteres e verificação contra senhas comuns vazadas.
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (!password || password.length < 12) {
    return {
      valid: false,
      message: 'A senha deve conter pelo menos 12 caracteres.',
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      message: 'A senha não pode exceder 128 caracteres.',
    };
  }

  const normalized = password.toLowerCase().trim();
  if (COMMON_PASSWORDS_BLACKLIST.has(normalized)) {
    return {
      valid: false,
      message: 'Esta senha é muito comum e insegura. Escolha uma combinação mais forte.',
    };
  }

  return { valid: true };
}

/**
 * Gera hash seguro de senha utilizando scrypt nativo (equivalente em força a Argon2/bcrypt).
 * Formato: scrypt:saltHex:hashHex
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  });

  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifica se a senha corresponde ao hash seguro em tempo constante (evitando timing attacks).
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }

    const salt = parts[1];
    const originalHashHex = parts[2];

    if (!salt || !originalHashHex) return false;

    const originalHash = Buffer.from(originalHashHex, 'hex');
    const computedHash = scryptSync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 32 * 1024 * 1024,
    });

    if (originalHash.length !== computedHash.length) {
      return false;
    }

    return timingSafeEqual(originalHash, computedHash);
  } catch {
    return false;
  }
}
