import { NextResponse } from 'next/server';
import { updateFeatureFlagSchema } from '@escala-igreja/contracts';
import { toggleFeatureFlagWithAudit } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { can } from '@escala-igreja/domain';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userContext = await getCurrentUserContext();

    if (!session || !userContext) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const allowed = can(userContext, 'system:technical:manage');
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Apenas administradores técnicos podem alterar regras técnicas e canais' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateFeatureFlagSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const updated = await toggleFeatureFlagWithAudit({
      key: parsed.data.key,
      enabled: parsed.data.enabled,
      actorId: session.userId,
      ip: clientIp,
    });

    return NextResponse.json({ success: true, flag: updated });
  } catch (err: unknown) {
    console.error('Erro ao atualizar feature flag:', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar configuração' },
      { status: 500 }
    );
  }
}
