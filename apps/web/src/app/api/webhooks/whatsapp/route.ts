import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;

    // 1. Validação de assinatura se configurada em produção
    if (webhookSecret) {
      const signature = request.headers.get('x-webhook-signature');
      const timestamp = request.headers.get('x-webhook-timestamp');

      if (!signature || !timestamp) {
        return NextResponse.json({ error: 'Assinatura ou timestamp ausente' }, { status: 401 });
      }

      // 2. Proteção contra ataques de repetição (janela de tolerância de 5 minutos)
      const ts = parseInt(timestamp, 10);
      if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
        return NextResponse.json({ error: 'Timestamp expirado ou fora da janela de tolerância' }, { status: 400 });
      }

      const bodyText = await request.text();
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(`${timestamp}.${bodyText}`)
        .digest('hex');

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSignature);

      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        return NextResponse.json({ error: 'Assinatura HMAC inválida' }, { status: 403 });
      }

      // Trata payload de forma segura (sem interpretar como comando ou HTML)
      return NextResponse.json({ success: true, received: true });
    }

    // Modo desenvolvimento / sem secret configurado
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ success: true, received: true, mode: 'unauthenticated-dev' });
  } catch (err: unknown) {
    console.error('Erro no webhook de WhatsApp:', err);
    return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 });
  }
}
