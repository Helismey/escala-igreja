import { NextResponse } from 'next/server';
import { prisma } from '@revezo/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { can } from '@revezo/domain';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const userContext = await getCurrentUserContext();

    if (!session || !userContext) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId') || session.userId;

    const allowed = can(userContext, 'availability:manage:own', { targetUserId: requestedUserId });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para visualizar estas disponibilidades.' },
        { status: 403 }
      );
    }

    const availabilities = await prisma.availability.findMany({
      where: { userId: requestedUserId },
    });

    const preferredWeekdays = availabilities
      .filter((a) => a.kind === 'PREFERRED_WEEKDAY' && typeof a.weekday === 'number')
      .map((a) => a.weekday as number)
      .sort((a, b) => a - b);

    const unavailablePeriods = availabilities
      .filter((a) => a.kind === 'UNAVAILABLE_PERIOD' && a.from && a.to)
      .map((a) => ({
        id: a.id,
        from: a.from!.toISOString(),
        to: a.to!.toISOString(),
      }))
      .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());

    return NextResponse.json({
      success: true,
      preferredWeekdays,
      unavailablePeriods,
    });
  } catch (error: unknown) {
    console.error('Erro ao buscar disponibilidades:', error);
    return NextResponse.json(
      { success: false, error: 'Não foi possível carregar as disponibilidades. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
