import { getCalendarFeedEventsByToken } from '@escala-igreja/db';
import { generateIcsCalendar } from '@escala-igreja/domain';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || token.length < 32) {
      return new Response('Token de calendário inválido ou ausente.', { status: 400 });
    }

    const data = await getCalendarFeedEventsByToken(token);
    if (!data) {
      return new Response('Feed de calendário não encontrado ou expirado.', { status: 404 });
    }

    const icsContent = generateIcsCalendar({
      calendarName: `Escalas — ${data.userName}`,
      description: 'Sincronização de compromissos de serviço voluntário',
      events: data.events,
    });

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="escala.ics"',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (err: unknown) {
    console.error('Erro ao gerar feed de calendário:', err);
    return new Response('Erro interno ao gerar calendário.', { status: 500 });
  }
}
