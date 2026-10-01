import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-service';
import { pushSubscriptionSchema } from '@escala-igreja/contracts';
import { prisma } from '@escala-igreja/db';

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
    const parsed = pushSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados de inscrição inválidos.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { endpoint, keys } = parsed.data;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.userId,
        keys,
      },
      create: {
        userId: session.userId,
        endpoint,
        keys,
      },
    });

    // Se o usuário estava com opt-out de push, reativa o canal ao registrar o dispositivo
    await prisma.user.update({
      where: { id: session.userId },
      data: { optOutPush: false },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'push:subscribe',
        targetType: 'PushSubscription',
        targetId: endpoint.substring(0, 40) + '...',
        result: 'SUCCESS',
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Dispositivo cadastrado com sucesso para receber notificações.',
    });
  } catch (error: unknown) {
    console.error('[API Push Subscribe] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao registrar inscrição de notificação.' },
      { status: 500 }
    );
  }
}
