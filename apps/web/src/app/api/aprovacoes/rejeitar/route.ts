import { NextResponse } from 'next/server';
import { rejectMemberSchema } from '@escala-igreja/contracts';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { can } from '@escala-igreja/domain';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userContext = await getCurrentUserContext();

    if (!session || !userContext) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = rejectMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const allowed = can(userContext, 'registration:reject');
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para rejeitar cadastros' },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parsed.data.userId },
        data: { status: 'REJECTED' },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          action: 'REGISTRATION_REJECTED',
          targetType: 'User',
          targetId: parsed.data.userId,
          result: 'SUCCESS',
          meta: { reason: parsed.data.reason },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Erro ao rejeitar cadastro:', err);
    return NextResponse.json(
      { success: false, error: 'Ocorreu um erro ao rejeitar o cadastro.' },
      { status: 500 }
    );
  }
}
