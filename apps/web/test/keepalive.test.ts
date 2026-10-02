import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../src/app/api/cron/keepalive/route';
import { prisma } from '@revezo/db';
import { NextRequest } from 'next/server';

vi.mock('@revezo/db', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe('Endpoint de Ping & Keepalive (/api/cron/keepalive)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejeita chamadas não autorizadas quando CRON_SECRET está configurado', async () => {
    process.env.CRON_SECRET = 'segredo-forte-123';

    const req = new NextRequest('http://localhost:3000/api/cron/keepalive', {
      headers: {
        Authorization: 'Bearer segredo-incorreto',
      },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Autorização inválida');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('executa SELECT 1 e retorna sucesso 200 quando autorizado', async () => {
    process.env.CRON_SECRET = 'segredo-forte-123';
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }]);

    const req = new NextRequest('http://localhost:3000/api/cron/keepalive', {
      headers: {
        Authorization: 'Bearer segredo-forte-123',
      },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status).toBe('ok');
    expect(data.database).toBe('connected');
    expect(typeof data.latencyMs).toBe('number');
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('retorna 503 com status disconnected se a conexão com o banco falhar', async () => {
    process.env.CRON_SECRET = 'segredo-forte-123';
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Connection timeout'));

    const req = new NextRequest('http://localhost:3000/api/cron/keepalive', {
      headers: {
        Authorization: 'Bearer segredo-forte-123',
      },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.success).toBe(false);
    expect(data.status).toBe('error');
    expect(data.database).toBe('disconnected');
    expect(data.error).toContain('Falha ao comunicar com o banco de dados');
  });
});
