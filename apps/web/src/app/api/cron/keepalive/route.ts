import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@escala-igreja/db';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (cronSecret) {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Autorização inválida para execução do keepalive.' },
        { status: 401 }
      );
    }
  }

  const startTime = Date.now();
  try {
    // Consulta ultraleve para acordar e renovar a atividade da instância no PostgreSQL
    await prisma.$queryRaw`SELECT 1;`;
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      status: 'ok',
      database: 'connected',
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha desconhecida';
    console.error('[Cron Keepalive] Erro ao conectar ao banco:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        status: 'error',
        database: 'disconnected',
        error: 'Falha ao comunicar com o banco de dados.',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
