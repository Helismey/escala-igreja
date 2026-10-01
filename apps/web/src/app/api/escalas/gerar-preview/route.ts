import { NextResponse } from 'next/server';
import { generateSchedulePreviewSchema } from '@escala-igreja/contracts';
import { previewAutoSchedule, prisma } from '@escala-igreja/db';
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
    const parsed = generateSchedulePreviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { programId, departmentId } = parsed.data;

    // Se informou um departamento, valida a permissão direta
    if (departmentId) {
      const allowed = can(userContext, 'assignment:create', { departmentId });
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Você não tem permissão para gerar escalas deste departamento' },
          { status: 403 }
        );
      }
    } else {
      // Se não informou departamento (geração geral do programa), exige ADMIN_MASTER ou ser gestor de algum depto
      const isAnyManagerOrAdmin =
        userContext.globalRole === 'ADMIN_MASTER' ||
        userContext.departmentMemberships.some((m) => m.role === 'MANAGER');

      if (!isAnyManagerOrAdmin) {
        return NextResponse.json(
          { success: false, error: 'Apenas gestores ou administradores podem gerar escalas' },
          { status: 403 }
        );
      }
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const preview = await previewAutoSchedule({
      programId,
      departmentId,
      actorId: session.userId,
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao gerar prévia da escala';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
