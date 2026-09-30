import { describe, expect, it } from 'vitest';
import {
  encryptField,
  decryptField,
  validatePasswordPolicy,
  hashPassword,
  verifyPassword,
  InMemoryRateLimiter,
  generateTotpSecret,
  computeTotp,
  verifyTotp,
  generateRecoveryCodes,
} from '../src/index.js';

describe('Criptografia AES-256-GCM', () => {
  const secretKey = '12345678901234567890123456789012'; // 32 bytes

  it('criptografa e decriptografa string preservando conteúdo exato', () => {
    const plain = 'Rua das Palmeiras, 456, Bairro Centro, Goiânia-GO';
    const encrypted = encryptField(plain, secretKey);

    expect(encrypted).toContain('v1:');
    expect(encrypted).not.toBe(plain);

    const decrypted = decryptField(encrypted, secretKey);
    expect(decrypted).toBe(plain);
  });

  it('falha ao tentar decriptografar se o ciphertext ou a tag forem adulterados', () => {
    const plain = 'Contato de emergência: Mãe (62) 99999-0000';
    const encrypted = encryptField(plain, secretKey);

    const parts = encrypted.split(':');
    // Adultera o último caractere do ciphertext
    const tamperedCipher = parts[3]!.slice(0, -2) + (parts[3]!.endsWith('aa') ? 'bb' : 'aa');
    const tamperedPayload = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedCipher}`;

    expect(() => decryptField(tamperedPayload, secretKey)).toThrow();
  });
});

describe('Políticas de Senha e Hash Seguro', () => {
  it('rejeita senhas com menos de 12 caracteres', () => {
    const res = validatePasswordPolicy('curta12345');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('12 caracteres');
  });

  it('rejeita senhas conhecidas da lista de senhas fracas comuns', () => {
    const res = validatePasswordPolicy('senha12345678');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('muito comum');
  });

  it('aceita senhas com 12+ caracteres seguras', () => {
    const res = validatePasswordPolicy('MinhaSenhaSuperForte!2026');
    expect(res.valid).toBe(true);
  });

  it('gera hash seguro e valida senha com sucesso', () => {
    const pass = 'UmaSenhaMuitoSegura99#';
    const hash = hashPassword(pass);

    expect(hash).toContain('scrypt:');
    expect(verifyPassword(pass, hash)).toBe(true);
    expect(verifyPassword('SenhaIncorreta123', hash)).toBe(false);
  });
});

describe('Rate Limiter em Memória (Sliding Window)', () => {
  it('permite tentativas dentro do limite e bloqueia ao exceder', () => {
    const limiter = new InMemoryRateLimiter({
      maxAttempts: 3,
      windowMs: 1000,
      blockDurationMs: 2000,
    });

    const ip = '192.168.1.50';

    // 1ª tentativa
    const att1 = limiter.recordAttempt(ip);
    expect(att1.blocked).toBe(false);
    expect(att1.remainingAttempts).toBe(2);

    // 2ª tentativa
    const att2 = limiter.recordAttempt(ip);
    expect(att2.blocked).toBe(false);
    expect(att2.remainingAttempts).toBe(1);

    // 3ª tentativa: excede e bloqueia
    const att3 = limiter.recordAttempt(ip);
    expect(att3.blocked).toBe(true);
    expect(att3.remainingAttempts).toBe(0);

    // Verificação de bloqueio ativo
    const status = limiter.isBlocked(ip);
    expect(status.blocked).toBe(true);
    expect(status.remainingMs).toBeGreaterThan(0);

    // Reset limpa o bloqueio
    limiter.reset(ip);
    expect(limiter.isBlocked(ip).blocked).toBe(false);
  });
});

describe('MFA / TOTP (RFC 6238)', () => {
  it('gera segredo e valida token TOTP correspondente', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);

    const now = Date.now();
    const counter = Math.floor(now / 1000 / 30);
    const token = computeTotp(secret, counter);

    expect(token).toMatch(/^\d{6}$/);
    expect(verifyTotp(token, secret, now)).toBe(true);
    expect(verifyTotp('000000', secret, now)).toBe(false);
  });

  it('gera 8 códigos de recuperação e seus hashes correspondentes', () => {
    const { plainCodes, hashedCodes } = generateRecoveryCodes();
    expect(plainCodes).toHaveLength(8);
    expect(hashedCodes).toHaveLength(8);
    expect(plainCodes[0]).toHaveLength(10);
    expect(hashedCodes[0]).toHaveLength(64); // SHA-256 hex
  });
});
