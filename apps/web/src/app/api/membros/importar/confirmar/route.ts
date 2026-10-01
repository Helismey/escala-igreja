import { NextResponse } from 'next/server';
import { confirmImportMembersSchema } from '@escala-igreja/contracts';
import { batchImportMembersWithAudit } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { can } from '@escala-igreja/domain';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userContext = await getCurrentUserContext();

    if (!session || !userContext) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(userContext, 'member:import')) {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores podem importar membros por planilha' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = confirmImportMembersSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const result = await batchImportMembersWithAudit({
      rows: parsed.data.rows,
      defaultStatus: parsed.data.defaultStatus,
      updateExisting: parsed.data.updateExisting,
      actorId: session.userId,
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao confirmar importação de membros';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
