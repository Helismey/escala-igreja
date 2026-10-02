import { describe, expect, it } from 'vitest';
import {
  escapeIcsText,
  formatIcsUtcDate,
  generateIcsCalendar,
  IcsCalendarEvent,
} from '../src/index.js';

describe('Calendário: Escapamento e Formatação RFC 5545', () => {
  it('escapa adequadamente caracteres especiais (vírgulas, ponto-e-vírgula, barras e quebras de linha)', () => {
    const raw = 'Louvor, Adoração; Música\nSegunda linha\\teste';
    const escaped = escapeIcsText(raw);
    expect(escaped).toBe('Louvor\\, Adoração\\; Música\\nSegunda linha\\\\teste');
  });

  it('formata data no padrão UTC exigido pelo iCalendar (YYYYMMDDTHHMMSSZ)', () => {
    const date = new Date('2026-10-18T12:30:00.000Z');
    expect(formatIcsUtcDate(date)).toBe('20261018T123000Z');
  });
});

describe('Calendário: Geração do Feed iCalendar (.ics)', () => {
  it('gera cabeçalhos e eventos VEVENT em conformidade com o padrão RFC 5545', () => {
    const events: IcsCalendarEvent[] = [
      {
        id: 'event-1',
        title: 'Escala: Louvor (Violão)',
        description: 'Culto da Família no templo principal',
        location: 'Igreja Central',
        startsAt: '2026-10-18T09:00:00.000Z',
        endsAt: '2026-10-18T10:30:00.000Z',
        status: 'CONFIRMED',
        url: 'https://escala.igreja.local/minha-escala',
      },
    ];

    const icsContent = generateIcsCalendar({
      calendarName: 'Escalas de João Silva',
      description: 'Feed de compromissos de serviço voluntário',
      events,
    });

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('PRODID:-//Revezo//Escala Voluntarios v1.0//PT_BR');
    expect(icsContent).toContain('X-WR-CALNAME:Escalas de João Silva');
    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('UID:event-1@revezo.local');
    expect(icsContent).toContain('SUMMARY:Escala: Louvor (Violão)');
    expect(icsContent).toContain('DESCRIPTION:Culto da Família no templo principal');
    expect(icsContent).toContain('LOCATION:Igreja Central');
    expect(icsContent).toContain('DTSTART:20261018T090000Z');
    expect(icsContent).toContain('DTEND:20261018T103000Z');
    expect(icsContent).toContain('STATUS:CONFIRMED');
    expect(icsContent).toContain('END:VEVENT');
    expect(icsContent).toContain('END:VCALENDAR');
    // Quebras de linha CRLF (\r\n)
    expect(icsContent).toContain('\r\n');
  });

  it('omite eventos cancelados para não poluir a agenda do membro', () => {
    const events: IcsCalendarEvent[] = [
      {
        id: 'event-active',
        title: 'Escala: Recepção',
        description: 'Boas-vindas',
        startsAt: '2026-10-18T09:00:00.000Z',
        endsAt: '2026-10-18T10:30:00.000Z',
        status: 'CONFIRMED',
      },
      {
        id: 'event-cancelled',
        title: 'Escala: Mídia',
        description: 'Desmarcado',
        startsAt: '2026-10-18T18:00:00.000Z',
        endsAt: '2026-10-18T19:30:00.000Z',
        status: 'CANCELLED',
      },
    ];

    const icsContent = generateIcsCalendar({ events });

    expect(icsContent).toContain('UID:event-active@revezo.local');
    expect(icsContent).not.toContain('UID:event-cancelled@revezo.local');
  });
});
