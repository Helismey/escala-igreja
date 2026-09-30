import { NextResponse } from 'next/server';
import { removeAssignmentSchema } from '@escala-igreja/contracts';
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
    const parsed = removeAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: parsed.data.assignmentId },
      include: {
        slot: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Escala não encontrada' }, { status: 404 });
    }

    const allowed = can(userContext, 'assignment:delete', { departmentId: assignment.slot.departmentId });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para remover escalas deste departamento' },
        { status: 403 }
      );
    }

    await prisma.assignment.delete({
      where: { id: assignment.id },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'ASSIGNMENT_DELETED',
        targetType: 'Assignment',
        targetId: assignment.id,
        result: 'SUCCESS',
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao remover escala';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
