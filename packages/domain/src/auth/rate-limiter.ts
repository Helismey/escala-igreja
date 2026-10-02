export interface RateLimitOptions {
  maxAttempts: number;      // Número máximo de tentativas antes do bloqueio (ex: 5)
  windowMs: number;         // Janela de tempo em ms (ex: 15 * 60 * 1000 = 15 minutos)
  blockDurationMs?: number; // Duração do bloqueio após exceder (default = windowMs)
}

interface AttemptRecord {
  timestamps: number[];
  blockedUntil?: number;
}

export class InMemoryRateLimiter {
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
  public isBlocked(key: string): { blocked: boolean; remainingMs: number } {
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
  public recordAttempt(key: string): { blocked: boolean; remainingAttempts: number; retryAfterMs: number } {
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
