import { NextResponse } from 'next/server';
import { cancelSwapRequestWithAudit } from '@revezo/db';
import { getSession } from '@/lib/auth-service';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const swapRequestId = body?.swapRequestId;

    if (!swapRequestId || typeof swapRequestId !== 'string') {
      return NextResponse.json({ success: false, error: 'ID do pedido de troca inválido' }, { status: 400 });
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const result = await cancelSwapRequestWithAudit({
      swapRequestId,
      requesterId: session.userId,
      ip: clientIp,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao cancelar pedido de troca';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
