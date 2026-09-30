import { NextResponse } from 'next/server';
import { assignManagerSchema } from '@escala-igreja/contracts';
import { assignDepartmentManagerWithAudit } from '@escala-igreja/db';
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
    const parsed = assignManagerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const allowed = can(userContext, 'manager:assign');

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores podem nomear gestores de departamento' },
        { status: 403 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    await assignDepartmentManagerWithAudit({
      departmentId: parsed.data.departmentId,
      userId: parsed.data.userId,
      actorId: session.userId,
      ip: clientIp,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao definir gestor do departamento';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
