import { describe, expect, it } from 'vitest';
import {
  generateActionToken,
  hashActionToken,
  isActionTokenExpired,
  isActionTokenValid,
  calculateTokenExpiration,
  validatePasswordPolicy,
} from '../src/index.js';

describe('ActionToken e Recuperação de Senha (Domínio)', () => {
  it('gera token com 32 bytes hex (64 caracteres) e hash SHA-256 correto', () => {
    const { rawToken, tokenHash } = generateActionToken();

    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashActionToken(rawToken)).toBe(tokenHash);
  });

  it('calcula hash SHA-256 determinístico e não-reversível', () => {
    const token = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    const hash1 = hashActionToken(token);
    const hash2 = hashActionToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(token);
  });

  it('detecta tokens expirados corretamente', () => {
    const now = new Date('2026-09-30T15:00:00Z');
    const past = new Date('2026-09-30T14:59:59Z');
    const future = new Date('2026-09-30T15:30:00Z');

    expect(isActionTokenExpired(past, now)).toBe(true);
    expect(isActionTokenExpired(future, now)).toBe(false);
  });

  it('valida token ativo e não utilizado', () => {
    const now = new Date('2026-09-30T15:00:00Z');
    const future = new Date('2026-09-30T15:30:00Z');

    const result = isActionTokenValid({ usedAt: null, expiresAt: future }, now);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('rejeita token já utilizado (usedAt não nulo)', () => {
    const now = new Date('2026-09-30T15:00:00Z');
    const future = new Date('2026-09-30T15:30:00Z');
    const usedAt = new Date('2026-09-30T15:05:00Z');

    const result = isActionTokenValid({ usedAt, expiresAt: future }, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('ALREADY_USED');
  });

  it('rejeita token com data de expiração atingida', () => {
    const now = new Date('2026-09-30T15:31:00Z');
    const expiresAt = new Date('2026-09-30T15:30:00Z');

    const result = isActionTokenValid({ usedAt: null, expiresAt }, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('EXPIRED');
  });

  it('calcula expiração respeitando o limite e o horário do evento', () => {
    const now = new Date('2026-09-30T10:00:00Z');
    const eventIn2Days = new Date('2026-10-02T19:00:00Z');
    const eventIn10Days = new Date('2026-10-10T19:00:00Z');

    // Evento antes do limite de 7 dias: expira no evento
    const exp1 = calculateTokenExpiration(eventIn2Days, 7, now);
    expect(exp1.getTime()).toBe(eventIn2Days.getTime());

    // Evento depois do limite de 7 dias: expira em 7 dias
    const exp2 = calculateTokenExpiration(eventIn10Days, 7, now);
    const expected7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(exp2.getTime()).toBe(expected7Days.getTime());
  });

  it('garante que nova senha na redefinição cumpra política de segurança', () => {
    const weakPass = '123456';
    const strongPass = 'NovaSenhaSegura@2026';

    expect(validatePasswordPolicy(weakPass).valid).toBe(false);
    expect(validatePasswordPolicy(strongPass).valid).toBe(true);
  });
});
