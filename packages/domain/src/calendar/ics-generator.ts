export interface IcsCalendarEvent {
  id: string;
  title: string;
  description: string;
  location?: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  url?: string;
}

export interface IcsCalendarOptions {
  calendarName?: string;
  description?: string;
  events: IcsCalendarEvent[];
}

/**
 * Escapa texto conforme especificação RFC 5545 do iCalendar.
 */
export function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Formata um objeto Date ou string no formato UTC iCalendar: YYYYMMDDTHHMMSSZ
 */
export function formatIcsUtcDate(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return '19700101T000000Z';
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Gera um arquivo no padrão RFC 5545 (.ics) contendo a lista de compromissos da escala.
 */
export function generateIcsCalendar(options: IcsCalendarOptions): string {
  const calName = options.calendarName || 'Minhas Escalas — Revezo';
  const nowUtc = formatIcsUtcDate(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Revezo//Escala Voluntarios v1.0//PT_BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  if (options.description) {
    lines.push(`X-WR-CALDESC:${escapeIcsText(options.description)}`);
  }

  for (const ev of options.events) {
    // Ignora eventos cancelados caso não seja necessário sincronizar remoção explícita
    if (ev.status === 'CANCELLED') {
      continue;
    }

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@revezo.local`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART:${formatIcsUtcDate(ev.startsAt)}`);
    lines.push(`DTEND:${formatIcsUtcDate(ev.endsAt)}`);
    lines.push(`SUMMARY:${escapeIcsText(ev.title)}`);

    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    }

    if (ev.location) {
      lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    }

    if (ev.url) {
      lines.push(`URL:${ev.url}`);
    }

    lines.push(`STATUS:${ev.status || 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 estipula quebras de linha com CRLF (\r\n)
  return lines.join('\r\n') + '\r\n';
}
