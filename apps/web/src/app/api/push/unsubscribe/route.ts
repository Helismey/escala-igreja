import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-service';
import { prisma } from '@escala-igreja/db';
import { unsubscribePushSchema } from '@escala-igreja/contracts';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = unsubscribePushSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Endpoint obrigatório para cancelamento.' },
        { status: 400 }
      );
    }

    const { endpoint } = parsed.data;

    // Remove do banco apenas se o registro pertencer ao usuário logado (evita IDOR)
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing && existing.userId === session.userId) {
      await prisma.pushSubscription.delete({
        where: { endpoint },
      });

      await prisma.auditLog.create({
        data: {
          actorId: session.userId,
          action: 'push:unsubscribe',
          targetType: 'PushSubscription',
          targetId: endpoint.substring(0, 40) + '...',
          result: 'SUCCESS',
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Dispositivo desvinculado com sucesso.',
    });
  } catch (error: unknown) {
    console.error('[API Push Unsubscribe] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao desvincular dispositivo de notificação.' },
      { status: 500 }
    );
  }
}
