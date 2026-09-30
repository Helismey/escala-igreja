import { NextResponse } from 'next/server';
import { createProgramSchema } from '@escala-igreja/contracts';
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
    const parsed = createProgramSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados do programa inválidos' },
        { status: 400 }
      );
    }

    const allowed = can(userContext, 'program:create', {
      departmentIds: parsed.data.departmentIds,
    });

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para criar programas nestes departamentos' },
        { status: 403 }
      );
    }

    const newProgram = await prisma.$transaction(async (tx) => {
      const prog = await tx.program.create({
        data: {
          title: parsed.data.title,
          date: new Date(parsed.data.date),
          departments: {
            create: parsed.data.departmentIds.map((deptId) => ({
              departmentId: deptId,
            })),
          },
          slots: {
            create: parsed.data.slots.map((s) => ({
              title: s.title,
              departmentId: s.departmentId,
              functionId: s.functionId || null,
              startsAt: new Date(s.startsAt),
              endsAt: new Date(s.endsAt),
              requiredCount: s.requiredCount,
            })),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          action: 'PROGRAM_CREATED',
          targetType: 'Program',
          targetId: prog.id,
          result: 'SUCCESS',
          meta: { title: prog.title },
        },
      });

      return prog;
    });

    return NextResponse.json({ success: true, programId: newProgram.id });
  } catch (err: unknown) {
    console.error('Erro ao criar programa:', err);
    return NextResponse.json(
      { success: false, error: 'Ocorreu um erro ao salvar o programa.' },
      { status: 500 }
    );
  }
}
