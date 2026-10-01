import { NextResponse } from 'next/server';
import { adminCreateMemberSchema } from '@escala-igreja/contracts';
import { createMemberWithAudit } from '@escala-igreja/db';
import { getSession, getCurrentUserContext, getActiveChurchContext } from '@/lib/auth-service';
import { can } from '@escala-igreja/domain';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userContext = await getCurrentUserContext();

    if (!session || !userContext) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const churchContext = await getActiveChurchContext();
    const activeChurchId = churchContext?.activeChurch?.id || userContext.churchId;

    const body = await request.json();
    const parsed = adminCreateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { departmentId } = parsed.data;

    const allowed = can(userContext, 'member:create', {
      churchId: activeChurchId || undefined,
      departmentId: departmentId || undefined,
    });

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para cadastrar voluntários neste departamento/congregação' },
        { status: 403 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const user = await createMemberWithAudit({
      ...parsed.data,
      churchId: activeChurchId,
      actorId: session.userId,
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      memberId: user.id,
      name: user.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao cadastrar voluntário';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
