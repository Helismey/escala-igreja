import { describe, expect, it } from 'vitest';
import {
  validateUnavailablePeriod,
  isDateInUnavailablePeriods,
  matchesPreferredWeekdays,
  formatWeekdayPtBr,
  summarizeAvailabilities,
  checkEligibility,
  CandidateUser,
  SlotRequirement,
} from '../src/index.js';

describe('Domínio: Validação de Período de Indisponibilidade', () => {
  it('aprova período válido onde início é anterior ao fim', () => {
    const result = validateUnavailablePeriod(
      '2026-11-01T00:00:00.000Z',
      '2026-11-10T23:59:59.000Z'
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejeita período quando o término é anterior ao início', () => {
    const result = validateUnavailablePeriod(
      '2026-11-10T00:00:00.000Z',
      '2026-11-01T00:00:00.000Z'
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('data de término');
  });

  it('rejeita datas malformadas ou inválidas', () => {
    const result = validateUnavailablePeriod('data-invalida', '2026-11-10T00:00:00.000Z');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('inválida');
  });
});

describe('Domínio: Detecção de Conflito com Períodos Indisponíveis', () => {
  const periods = [
    {
      from: new Date('2026-10-15T00:00:00Z'),
      to: new Date('2026-10-20T23:59:59Z'),
    },
  ];

  it('detecta conflito quando o slot está inteiramente dentro do período indisponível', () => {
    const startsAt = new Date('2026-10-18T09:00:00Z');
    const endsAt = new Date('2026-10-18T11:00:00Z');
    expect(isDateInUnavailablePeriods(startsAt, endsAt, periods)).toBe(true);
  });

  it('detecta conflito em sobreposição parcial', () => {
    const startsAt = new Date('2026-10-14T20:00:00Z');
    const endsAt = new Date('2026-10-15T02:00:00Z');
    expect(isDateInUnavailablePeriods(startsAt, endsAt, periods)).toBe(true);
  });

  it('NÃO detecta conflito se o slot ocorrer completamente antes ou depois', () => {
    const beforeSlot = {
      startsAt: new Date('2026-10-10T09:00:00Z'),
      endsAt: new Date('2026-10-10T11:00:00Z'),
    };
    const afterSlot = {
      startsAt: new Date('2026-10-25T09:00:00Z'),
      endsAt: new Date('2026-10-25T11:00:00Z'),
    };
    expect(isDateInUnavailablePeriods(beforeSlot.startsAt, beforeSlot.endsAt, periods)).toBe(false);
    expect(isDateInUnavailablePeriods(afterSlot.startsAt, afterSlot.endsAt, periods)).toBe(false);
  });

  it('NÃO entra em conflito quando os horários são contíguos (encostados)', () => {
    // Termina exatamente quando o período começa
    const adjacentBefore = {
      startsAt: new Date('2026-10-14T22:00:00Z'),
      endsAt: new Date('2026-10-15T00:00:00Z'),
    };
    expect(isDateInUnavailablePeriods(adjacentBefore.startsAt, adjacentBefore.endsAt, periods)).toBe(false);
  });
});

describe('Domínio: Preferências de Dias da Semana', () => {
  it('retorna true quando o voluntário não tem restrição (lista vazia)', () => {
    const sunday = new Date('2026-10-18T10:00:00Z'); // Domingo
    expect(matchesPreferredWeekdays(sunday, [])).toBe(true);
  });

  it('retorna true quando o dia coincide com a lista de preferências', () => {
    const sunday = new Date('2026-10-18T10:00:00Z'); // getUTCDay() = 0 (Domingo)
    expect(matchesPreferredWeekdays(sunday, [0, 3])).toBe(true); // Domingo e Quarta
  });

  it('retorna false quando o dia NÃO coincide com as preferências', () => {
    const wednesday = new Date('2026-10-21T19:00:00Z'); // Quarta-feira (3)
    expect(matchesPreferredWeekdays(wednesday, [0, 6])).toBe(false); // Apenas Domingo e Sábado
  });
});

describe('Domínio: Formatação e Sumarização pt-BR', () => {
  it('formata os dias da semana em português corretamente', () => {
    expect(formatWeekdayPtBr(0)).toBe('Domingo');
    expect(formatWeekdayPtBr(1)).toBe('Segunda-feira');
    expect(formatWeekdayPtBr(3)).toBe('Quarta-feira');
    expect(formatWeekdayPtBr(6)).toBe('Sábado');
  });

  it('sumariza disponibilidades separando preferências e indisponibilidades', () => {
    const rawList = [
      { kind: 'PREFERRED_WEEKDAY' as const, weekday: 3 },
      { kind: 'PREFERRED_WEEKDAY' as const, weekday: 0 },
      {
        kind: 'UNAVAILABLE_PERIOD' as const,
        from: '2026-12-20T00:00:00Z',
        to: '2026-12-31T23:59:59Z',
      },
    ];

    const summary = summarizeAvailabilities(rawList);
    expect(summary.preferredWeekdays).toEqual([0, 3]); // Ordenados: Domingo (0), Quarta (3)
    expect(summary.unavailablePeriods).toHaveLength(1);
    expect(summary.hasPreferences).toBe(true);
  });
});

describe('Domínio: Integração de Disponibilidade com checkEligibility', () => {
  const baseSlot: SlotRequirement = {
    id: 'slot-1',
    title: 'Louvor - Voz',
    departmentId: 'dept-louvor',
    functionId: 'func-voz',
    startsAt: '2026-10-18T09:00:00-03:00', // Domingo
    endsAt: '2026-10-18T10:30:00-03:00',
  };

  const candidate: CandidateUser = {
    id: 'user-maria',
    name: 'Maria Souza',
    status: 'ACTIVE',
    departmentMemberships: [
      {
        departmentId: 'dept-louvor',
        functions: [{ functionId: 'func-voz' }],
      },
    ],
    assignments: [],
  };

  it('bloqueia voluntário com indisponibilidade cadastrada para a data do slot', () => {
    const candidateUnavailable: CandidateUser = {
      ...candidate,
      availabilities: [
        {
          kind: 'UNAVAILABLE_PERIOD',
          from: '2026-10-15T00:00:00-03:00',
          to: '2026-10-20T23:59:59-03:00',
        },
      ],
    };

    const result = checkEligibility(candidateUnavailable, baseSlot);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('indisponibilidade');
  });

  it('bloqueia voluntário escalado fora do dia de preferência quando tem preferências cadastradas', () => {
    // Domingo = 0. Voluntário prefere apenas Sábados (6).
    const candidatePrefersSaturday: CandidateUser = {
      ...candidate,
      availabilities: [
        {
          kind: 'PREFERRED_WEEKDAY',
          weekday: 6,
        },
      ],
    };

    const result = checkEligibility(candidatePrefersSaturday, baseSlot);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('preferências do voluntário');
  });

  it('permite voluntário quando o dia coincide com a sua preferência', () => {
    const candidatePrefersSunday: CandidateUser = {
      ...candidate,
      availabilities: [
        {
          kind: 'PREFERRED_WEEKDAY',
          weekday: 0, // Domingo
        },
      ],
    };

    const result = checkEligibility(candidatePrefersSunday, baseSlot);
    expect(result.eligible).toBe(true);
  });
});
