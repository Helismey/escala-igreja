import { DEFAULT_TIMEZONE, getLocalDateString } from './daily-limit.js';
import { UserAvailability } from './eligibility.js';

export interface UnavailablePeriod {
  id?: string;
  from: Date | string;
  to: Date | string;
}

export const WEEKDAYS_PT_BR: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

/**
 * Retorna o nome por extenso do dia da semana em português do Brasil.
 */
export function formatWeekdayPtBr(weekday: number): string {
  return WEEKDAYS_PT_BR[weekday] ?? `Dia ${weekday}`;
}

/**
 * Valida se um período de indisponibilidade possui datas válidas e coerentes.
 */
export function validateUnavailablePeriod(
  from: Date | string,
  to: Date | string
): { valid: boolean; error?: string } {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return {
      valid: false,
      error: 'Data de início ou término inválida.',
    };
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return {
      valid: false,
      error: 'A data de término deve ser posterior ou igual à data de início.',
    };
  }

  return { valid: true };
}

/**
 * Verifica se um intervalo de horário de slot coincide com algum período de indisponibilidade.
 */
export function isDateInUnavailablePeriods(
  startsAt: Date | string,
  endsAt: Date | string,
  periods: { from: Date | string | null | undefined; to: Date | string | null | undefined }[]
): boolean {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();

  for (const p of periods) {
    if (!p.from || !p.to) continue;
    const fromMs = new Date(p.from).getTime();
    const toMs = new Date(p.to).getTime();

    // Sobreposição: inícioA < fimB && fimA > inícioB
    if (startMs < toMs && endMs > fromMs) {
      return true;
    }
  }

  return false;
}

/**
 * Obtém o dia da semana (0-6, Domingo = 0) de uma data no fuso de Brasília.
 */
export function getWeekdayInTimezone(date: Date | string, timeZone = DEFAULT_TIMEZONE): number {
  const localDateStr = getLocalDateString(date, timeZone);
  // Meio-dia UTC da data local garante o cálculo exato do dia da semana civil
  return new Date(`${localDateStr}T12:00:00Z`).getUTCDay();
}

/**
 * Verifica se a data atende às preferências de dias da semana cadastradas pelo voluntário.
 * Se nenhuma preferência estiver cadastrada (array vazio), o voluntário é considerado disponível em qualquer dia.
 */
export function matchesPreferredWeekdays(
  date: Date | string,
  preferredWeekdays: number[],
  timeZone = DEFAULT_TIMEZONE
): boolean {
  if (preferredWeekdays.length === 0) {
    return true;
  }

  const weekday = getWeekdayInTimezone(date, timeZone);
  return preferredWeekdays.includes(weekday);
}

export interface AvailabilitySummary {
  preferredWeekdays: number[];
  unavailablePeriods: UnavailablePeriod[];
  hasPreferences: boolean;
}

/**
 * Sumariza e categoriza a lista de disponibilidades de um usuário.
 */
export function summarizeAvailabilities(availabilities: UserAvailability[]): AvailabilitySummary {
  const preferredWeekdays: number[] = [];
  const unavailablePeriods: UnavailablePeriod[] = [];

  for (const av of availabilities) {
    if (av.kind === 'PREFERRED_WEEKDAY' && typeof av.weekday === 'number') {
      if (!preferredWeekdays.includes(av.weekday)) {
        preferredWeekdays.push(av.weekday);
      }
    } else if (av.kind === 'UNAVAILABLE_PERIOD' && av.from && av.to) {
      unavailablePeriods.push({
        from: av.from,
        to: av.to,
      });
    }
  }

  preferredWeekdays.sort((a, b) => a - b);

  return {
    preferredWeekdays,
    unavailablePeriods,
    hasPreferences: preferredWeekdays.length > 0,
  };
}
