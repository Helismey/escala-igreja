import { describe, expect, it } from 'vitest';
import {
  encryptField,
  decryptField,
  validatePasswordPolicy,
  hashPassword,
  verifyPassword,
  InMemoryRateLimiter,
  HybridRateLimiter,
  generateTotpSecret,
  computeTotp,
  verifyTotp,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
  formatSecretForDisplay,
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

  it('faz limpeza automática de registros expirados ao atingir o limite de segurança', () => {
    const limiter = new InMemoryRateLimiter({
      maxAttempts: 3,
      windowMs: 50,
      blockDurationMs: 50,
    });

    // Simula 1000 chaves com timestamps passados
    for (let i = 0; i < 1000; i++) {
      limiter.recordAttempt(`ip-${i}`);
    }

    // Aguarda expiração da janela (60ms)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Ao registrar a próxima tentativa, deve acionar a auto-limpeza sem erros
        const att = limiter.recordAttempt('ip-novo');
        expect(att.blocked).toBe(false);
        resolve();
      }, 60);
    });
  });
});

describe('HybridRateLimiter (Upstash Redis REST + Fallback)', () => {
  it('opera em modo memória quando variáveis de Redis não são informadas', async () => {
    const hybrid = new HybridRateLimiter({
      prefix: 'test-mem',
      maxAttempts: 3,
      windowMs: 1000,
      blockDurationMs: 2000,
    });

    const key = '10.0.0.1';

    const r1 = await hybrid.recordAttempt(key);
    expect(r1.blocked).toBe(false);
    expect(r1.remainingAttempts).toBe(2);

    const r2 = await hybrid.recordAttempt(key);
    expect(r2.blocked).toBe(false);
    expect(r2.remainingAttempts).toBe(1);

    const r3 = await hybrid.recordAttempt(key);
    expect(r3.blocked).toBe(true);
    expect(r3.remainingAttempts).toBe(0);

    const status = await hybrid.isBlocked(key);
    expect(status.blocked).toBe(true);
    expect(status.remainingMs).toBeGreaterThan(0);

    await hybrid.reset(key);
    const afterReset = await hybrid.isBlocked(key);
    expect(afterReset.blocked).toBe(false);
  });

  it('comunica com Upstash Redis REST simulado corretamente', async () => {
    const redisStore = new Map<string, { val: any; ttl: number }>();

    // Mock fetch que simula comandos Upstash Redis REST
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      const isPipeline = url.endsWith('/pipeline');
      const body = JSON.parse(init?.body as string);

      if (isPipeline) {
        const results = (body as unknown[][]).map(([cmd, ...args]) => {
          if (cmd === 'INCR') {
            const key = args[0] as string;
            const curr = redisStore.get(key);
            const nextVal = (curr ? Number(curr.val) : 0) + 1;
            redisStore.set(key, { val: nextVal, ttl: curr?.ttl ?? -1 });
            return { result: nextVal };
          }
          if (cmd === 'PTTL') {
            const key = args[0] as string;
            const curr = redisStore.get(key);
            return { result: curr ? curr.ttl : -2 };
          }
          if (cmd === 'SET') {
            const key = args[0] as string;
            const val = args[1];
            const ttl = args[3] as number;
            redisStore.set(key, { val, ttl: ttl || -1 });
            return { result: 'OK' };
          }
          if (cmd === 'DEL') {
            args.forEach((k) => redisStore.delete(k as string));
            return { result: 1 };
          }
          return { result: null };
        });
        return new Response(JSON.stringify(results), { status: 200 });
      } else {
        const [cmd, ...args] = body as unknown[];
        if (cmd === 'PTTL') {
          const key = args[0] as string;
          const curr = redisStore.get(key);
          return new Response(JSON.stringify({ result: curr ? curr.ttl : -2 }), { status: 200 });
        }
        if (cmd === 'PEXPIRE') {
          const key = args[0] as string;
          const ttl = args[1] as number;
          const curr = redisStore.get(key);
          if (curr) curr.ttl = ttl;
          return new Response(JSON.stringify({ result: 1 }), { status: 200 });
        }
        if (cmd === 'DEL') {
          args.forEach((k) => redisStore.delete(k as string));
          return new Response(JSON.stringify({ result: 1 }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: null }), { status: 200 });
      }
    };

    const hybrid = new HybridRateLimiter({
      prefix: 'test-redis',
      maxAttempts: 2,
      windowMs: 5000,
      blockDurationMs: 10000,
      redisRestUrl: 'https://mock-upstash.local',
      redisRestToken: 'mock-token',
      customFetch: mockFetch as any,
    });

    const key = 'user@example.com';

    // Tentativa 1
    const att1 = await hybrid.recordAttempt(key);
    expect(att1.blocked).toBe(false);
    expect(att1.remainingAttempts).toBe(1);

    // Tentativa 2: atinge limite e bloqueia
    const att2 = await hybrid.recordAttempt(key);
    expect(att2.blocked).toBe(true);
    expect(att2.remainingAttempts).toBe(0);

    // Reset limpa do mock
    await hybrid.reset(key);
    const resetCheck = await hybrid.isBlocked(key);
    expect(resetCheck.blocked).toBe(false);
  });

  it('recupera graciosamente usando fallback em memória quando o fetch falhar', async () => {
    // Mock que lança erro simulando queda de rede ou timeout
    const failingFetch = async (): Promise<Response> => {
      throw new Error('Falha de conexão com Upstash Redis');
    };

    const hybrid = new HybridRateLimiter({
      prefix: 'test-failover',
      maxAttempts: 2,
      windowMs: 1000,
      blockDurationMs: 2000,
      redisRestUrl: 'https://down-upstash.local',
      redisRestToken: 'down-token',
      customFetch: failingFetch as any,
    });

    const key = '192.168.1.99';

    // Não deve lançar exceção, deve utilizar fallback em memória
    const att1 = await hybrid.recordAttempt(key);
    expect(att1.blocked).toBe(false);
    expect(att1.remainingAttempts).toBe(1);

    const att2 = await hybrid.recordAttempt(key);
    expect(att2.blocked).toBe(true);

    const isBlocked = await hybrid.isBlocked(key);
    expect(isBlocked.blocked).toBe(true);
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

  it('valida e consome código de recuperação com sucesso', () => {
    const { plainCodes, hashedCodes } = generateRecoveryCodes();
    const usedCode = plainCodes[2]!;

    const result = verifyAndConsumeRecoveryCode(usedCode, hashedCodes);
    expect(result.valid).toBe(true);
    expect(result.remainingHashedCodes).toHaveLength(7);
    expect(result.remainingHashedCodes).not.toContain(hashedCodes[2]);

    // Reutilizar o mesmo código deve falhar
    const reuseResult = verifyAndConsumeRecoveryCode(usedCode, result.remainingHashedCodes);
    expect(reuseResult.valid).toBe(false);
    expect(reuseResult.remainingHashedCodes).toHaveLength(7);
  });

  it('rejeita código de recuperação inexistente ou inválido', () => {
    const { hashedCodes } = generateRecoveryCodes();
    const invalidResult = verifyAndConsumeRecoveryCode('INVALID123', hashedCodes);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.remainingHashedCodes).toHaveLength(8);
  });

  it('formata segredo para exibição amigável em blocos de 4 caracteres', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const formatted = formatSecretForDisplay(secret);
    expect(formatted).toBe('JBSW Y3DP EHPK 3PXP');
  });
});
