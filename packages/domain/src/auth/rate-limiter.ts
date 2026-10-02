export interface RateLimitOptions {
  maxAttempts: number;      // Número máximo de tentativas antes do bloqueio (ex: 5)
  windowMs: number;         // Janela de tempo em ms (ex: 15 * 60 * 1000 = 15 minutos)
  blockDurationMs?: number; // Duração do bloqueio após exceder (default = windowMs)
  prefix?: string;          // Prefixo de isolamento de chave no Redis (ex: "login", "register")
  redisRestUrl?: string;    // URL da API REST do Upstash Redis (ou UPSTASH_REDIS_REST_URL)
  redisRestToken?: string;  // Token de autorização Bearer (ou UPSTASH_REDIS_REST_TOKEN)
  customFetch?: typeof fetch; // Para injeção de dependência e testes unitários
}

export interface BlockStatus {
  blocked: boolean;
  remainingMs: number;
}

export interface AttemptResult {
  blocked: boolean;
  remainingAttempts: number;
  retryAfterMs: number;
}

export interface RateLimiterContract {
  isBlocked(key: string): Promise<BlockStatus> | BlockStatus;
  recordAttempt(key: string): Promise<AttemptResult> | AttemptResult;
  reset(key: string): Promise<void> | void;
}

interface AttemptRecord {
  timestamps: number[];
  blockedUntil?: number;
}

/**
 * Rate Limiter baseado em memória do processo Node.js (Sliding Window).
 * Adequado para desenvolvimento local, testes e instâncias únicas com limite de expurgo anti-DoS.
 */
export class InMemoryRateLimiter implements RateLimiterContract {
  private records = new Map<string, AttemptRecord>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(options: RateLimitOptions) {
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.blockDurationMs = options.blockDurationMs ?? options.windowMs;
  }

  /**
   * Verifica se a chave (ex: IP ou email) está atualmente bloqueada.
   */
  public isBlocked(key: string): BlockStatus {
    const record = this.records.get(key);
    if (!record) {
      return { blocked: false, remainingMs: 0 };
    }

    const now = Date.now();
    if (record.blockedUntil && record.blockedUntil > now) {
      return { blocked: true, remainingMs: record.blockedUntil - now };
    }

    return { blocked: false, remainingMs: 0 };
  }

  /**
   * Registra uma falha ou tentativa e retorna se deve ser bloqueado.
   */
  public recordAttempt(key: string): AttemptResult {
    // Defesa contra esgotamento de memória por spoofing de IP em larga escala
    if (this.records.size >= 1000) {
      this.cleanup();
    }

    const now = Date.now();
    let record = this.records.get(key);

    if (!record) {
      record = { timestamps: [now] };
      this.records.set(key, record);
      return {
        blocked: false,
        remainingAttempts: this.maxAttempts - 1,
        retryAfterMs: 0,
      };
    }

    // Se já estiver bloqueado, mantém o bloqueio
    if (record.blockedUntil && record.blockedUntil > now) {
      return {
        blocked: true,
        remainingAttempts: 0,
        retryAfterMs: record.blockedUntil - now,
      };
    }

    // Filtra timestamps dentro da janela de tempo
    record.timestamps = record.timestamps.filter((t) => now - t < this.windowMs);
    record.timestamps.push(now);

    if (record.timestamps.length >= this.maxAttempts) {
      record.blockedUntil = now + this.blockDurationMs;
      return {
        blocked: true,
        remainingAttempts: 0,
        retryAfterMs: this.blockDurationMs,
      };
    }

    return {
      blocked: false,
      remainingAttempts: this.maxAttempts - record.timestamps.length,
      retryAfterMs: 0,
    };
  }

  /**
   * Reseta o histórico da chave após login ou ação bem-sucedida.
   */
  public reset(key: string): void {
    this.records.delete(key);
  }

  /**
   * Limpa registros expirados da memória.
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (record.blockedUntil && record.blockedUntil < now) {
        this.records.delete(key);
        continue;
      }
      record.timestamps = record.timestamps.filter((t) => now - t < this.windowMs);
      if (record.timestamps.length === 0 && !record.blockedUntil) {
        this.records.delete(key);
      }
    }
  }
}

/**
 * Rate Limiter Híbrido Serverless-Ready.
 * Se as variáveis UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN estiverem configuradas,
 * utiliza chamadas HTTP REST nativas ao Upstash Redis para estado distribuído compartilhado
 * entre lambdas da Vercel. Caso contrário (ou em caso de indisponibilidade da rede),
 * faz fallback automático e gracioso para memória local (InMemoryRateLimiter).
 */
export class HybridRateLimiter implements RateLimiterContract {
  private readonly memoryLimiter: InMemoryRateLimiter;
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;
  private readonly prefix: string;
  private readonly redisUrl?: string;
  private readonly redisToken?: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: RateLimitOptions) {
    this.memoryLimiter = new InMemoryRateLimiter(options);
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.blockDurationMs = options.blockDurationMs ?? options.windowMs;
    this.prefix = options.prefix || 'default';
    this.fetchFn = options.customFetch || (typeof fetch !== 'undefined' ? fetch : globalThis.fetch);

    this.redisUrl =
      options.redisRestUrl ||
      (typeof process !== 'undefined' && process.env ? process.env.UPSTASH_REDIS_REST_URL : undefined);
    this.redisToken =
      options.redisRestToken ||
      (typeof process !== 'undefined' && process.env ? process.env.UPSTASH_REDIS_REST_TOKEN : undefined);
  }

  private hasRedisConfigured(): boolean {
    return Boolean(this.redisUrl && this.redisToken);
  }

  private getCountKey(key: string): string {
    return `rl:${this.prefix}:count:${key}`;
  }

  private getBlockKey(key: string): string {
    return `rl:${this.prefix}:blocked:${key}`;
  }

  private async callRedisCommand(command: unknown[]): Promise<any> {
    if (!this.redisUrl || !this.redisToken) return null;

    const res = await this.fetchFn(this.redisUrl.replace(/\/$/, ''), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      throw new Error(`Upstash Redis HTTP error: ${res.status}`);
    }

    const data = await res.json();
    return data?.result;
  }

  private async callRedisPipeline(commands: unknown[][]): Promise<any[]> {
    if (!this.redisUrl || !this.redisToken) return [];

    const endpoint = `${this.redisUrl.replace(/\/$/, '')}/pipeline`;
    const res = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!res.ok) {
      throw new Error(`Upstash Redis Pipeline HTTP error: ${res.status}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data.map((item: any) => item?.result) : [];
  }

  public async isBlocked(key: string): Promise<BlockStatus> {
    if (!this.hasRedisConfigured()) {
      return this.memoryLimiter.isBlocked(key);
    }

    try {
      const blockKey = this.getBlockKey(key);
      const ttl = await this.callRedisCommand(['PTTL', blockKey]);

      if (typeof ttl === 'number' && ttl > 0) {
        return { blocked: true, remainingMs: ttl };
      }

      return { blocked: false, remainingMs: 0 };
    } catch (err: unknown) {
      console.warn('[HybridRateLimiter] Falha ao verificar bloqueio no Redis, usando fallback de memória:', err);
      return this.memoryLimiter.isBlocked(key);
    }
  }

  public async recordAttempt(key: string): Promise<AttemptResult> {
    if (!this.hasRedisConfigured()) {
      return this.memoryLimiter.recordAttempt(key);
    }

    try {
      // 1. Verifica se já está bloqueado
      const blockStatus = await this.isBlocked(key);
      if (blockStatus.blocked) {
        return {
          blocked: true,
          remainingAttempts: 0,
          retryAfterMs: blockStatus.remainingMs,
        };
      }

      // 2. Incrementa contador e checa expiração
      const countKey = this.getCountKey(key);
      const blockKey = this.getBlockKey(key);

      const [count, pttl] = await this.callRedisPipeline([
        ['INCR', countKey],
        ['PTTL', countKey],
      ]);

      const currentCount = typeof count === 'number' ? count : 1;

      // Se for a primeira tentativa (sem TTL definido), define expiração da janela
      if (pttl === -1 || pttl === -2) {
        await this.callRedisCommand(['PEXPIRE', countKey, this.windowMs]);
      }

      // 3. Se atingiu o limite de tentativas, bloqueia
      if (currentCount >= this.maxAttempts) {
        await this.callRedisPipeline([
          ['SET', blockKey, '1', 'PX', this.blockDurationMs],
          ['DEL', countKey],
        ]);

        return {
          blocked: true,
          remainingAttempts: 0,
          retryAfterMs: this.blockDurationMs,
        };
      }

      return {
        blocked: false,
        remainingAttempts: Math.max(0, this.maxAttempts - currentCount),
        retryAfterMs: 0,
      };
    } catch (err: unknown) {
      console.warn('[HybridRateLimiter] Falha ao registrar tentativa no Redis, usando fallback de memória:', err);
      return this.memoryLimiter.recordAttempt(key);
    }
  }

  public async reset(key: string): Promise<void> {
    this.memoryLimiter.reset(key);

    if (this.hasRedisConfigured()) {
      try {
        const countKey = this.getCountKey(key);
        const blockKey = this.getBlockKey(key);
        await this.callRedisCommand(['DEL', countKey, blockKey]);
      } catch (err: unknown) {
        console.warn('[HybridRateLimiter] Falha ao resetar chaves no Redis:', err);
      }
    }
  }
}
