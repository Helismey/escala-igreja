import { NextResponse } from 'next/server';
import { assignMemberSchema } from '@escala-igreja/contracts';
import { assignMemberWithLock, prisma } from '@escala-igreja/db';
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
    const parsed = assignMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    // Busca o departamento do slot para validação de escopo
    const slot = await prisma.programSlot.findUnique({
      where: { id: parsed.data.slotId },
      select: { departmentId: true },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot não encontrado' }, { status: 404 });
    }

    // Validação estrita de autorização RBAC com escopo
    const allowed = can(userContext, 'assignment:create', { departmentId: slot.departmentId });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para escalar neste departamento' },
        { status: 403 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // Executa a atribuição segura com trava e checagem de conflitos/limite diário
    await assignMemberWithLock({
      slotId: parsed.data.slotId,
      userId: parsed.data.userId,
      actorId: session.userId,
      ip: clientIp,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao atribuir escala';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
