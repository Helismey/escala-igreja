import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-service';
import { getOrCreateCalendarToken } from '@escala-igreja/db';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';

    const token = await getOrCreateCalendarToken(session.userId);

    const icsUrl = `${protocol}://${host}/api/calendario/${token}`;
    const webcalUrl = `webcal://${host}/api/calendario/${token}`;

    return NextResponse.json({
      success: true,
      token,
      icsUrl,
      webcalUrl,
    });
  } catch (err: unknown) {
    console.error('Erro ao gerar token de calendário:', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar link de calendário' },
      { status: 500 }
    );
  }
}
