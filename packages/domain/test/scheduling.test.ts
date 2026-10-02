import { describe, expect, it } from 'vitest';
import {
  hasTimeOverlap,
  findConflictingAssignment,
} from '../src/scheduling/conflict.js';
import {
  countDailyAssignments,
  wouldExceedDailyLimit,
  getLocalDateString,
  MAX_DAILY_ASSIGNMENTS,
  DEFAULT_TIMEZONE,
} from '../src/scheduling/daily-limit.js';
import {
  checkEligibility,
  rankCandidates,
  cloneSlotsForNewDate,
  CandidateUser,
  SlotRequirement,
} from '../src/index.js';

describe('Motor de Escala: Detecção de Conflitos', () => {
  it('detecta sobreposição parcial no início', () => {
    // A: 09:00 - 11:00, B: 10:00 - 12:00
    expect(hasTimeOverlap('2026-10-18T09:00:00Z', '2026-10-18T11:00:00Z', '2026-10-18T10:00:00Z', '2026-10-18T12:00:00Z')).toBe(true);
  });

  it('detecta sobreposição parcial no final', () => {
    // A: 10:00 - 12:00, B: 09:00 - 11:00
    expect(hasTimeOverlap('2026-10-18T10:00:00Z', '2026-10-18T12:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T11:00:00Z')).toBe(true);
  });

  it('detecta sobreposição total contida', () => {
    // A: 08:00 - 13:00, B: 09:00 - 11:00
    expect(hasTimeOverlap('2026-10-18T08:00:00Z', '2026-10-18T13:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T11:00:00Z')).toBe(true);
  });

  it('horários contíguos (encostados: término de um = início do outro) NÃO entram em conflito em ambas as direções', () => {
    // A antes de B contíguo: A termina quando B começa
    expect(hasTimeOverlap('2026-10-18T09:00:00Z', '2026-10-18T10:00:00Z', '2026-10-18T10:00:00Z', '2026-10-18T11:00:00Z')).toBe(false);
    // B antes de A contíguo: B termina quando A começa
    expect(hasTimeOverlap('2026-10-18T10:00:00Z', '2026-10-18T11:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T10:00:00Z')).toBe(false);
  });

  it('horários completamente separados NÃO entram em conflito', () => {
    expect(hasTimeOverlap('2026-10-18T08:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T14:00:00Z', '2026-10-18T16:00:00Z')).toBe(false);
  });

  it('lança erro ao receber datas inválidas em hasTimeOverlap', () => {
    expect(() => hasTimeOverlap('data-invalida', '2026-10-18T10:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T11:00:00Z')).toThrow(
      'Data inválida para cálculo de sobreposição'
    );
    expect(() => hasTimeOverlap('2026-10-18T09:00:00Z', 'invalida', '2026-10-18T09:00:00Z', '2026-10-18T11:00:00Z')).toThrow(
      'Data inválida para cálculo de sobreposição'
    );
    expect(() => hasTimeOverlap('2026-10-18T09:00:00Z', '2026-10-18T10:00:00Z', 'invalida', '2026-10-18T11:00:00Z')).toThrow(
      'Data inválida para cálculo de sobreposição'
    );
    expect(() => hasTimeOverlap('2026-10-18T09:00:00Z', '2026-10-18T10:00:00Z', '2026-10-18T09:00:00Z', 'invalida')).toThrow(
      'Data inválida para cálculo de sobreposição'
    );
  });

  it('lança erro quando o início é maior ou igual ao término em hasTimeOverlap', () => {
    expect(() => hasTimeOverlap('2026-10-18T11:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T10:00:00Z', '2026-10-18T12:00:00Z')).toThrow(
      'Horário de início deve ser anterior ao horário de término'
    );
    expect(() => hasTimeOverlap('2026-10-18T09:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T10:00:00Z', '2026-10-18T12:00:00Z')).toThrow(
      'Horário de início deve ser anterior ao horário de término'
    );
    expect(() => hasTimeOverlap('2026-10-18T08:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T12:00:00Z', '2026-10-18T10:00:00Z')).toThrow(
      'Horário de início deve ser anterior ao horário de término'
    );
    expect(() => hasTimeOverlap('2026-10-18T08:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T10:00:00Z', '2026-10-18T10:00:00Z')).toThrow(
      'Horário de início deve ser anterior ao horário de término'
    );
  });

  it('ignora escalas recusadas (DECLINED) e substituídas (SUBSTITUTED) ao verificar conflito', () => {
    const candidateSlot = {
      startsAt: '2026-10-18T09:00:00Z',
      endsAt: '2026-10-18T11:00:00Z',
    };
    const assignments = [
      {
        id: 'asg-1',
        startsAt: '2026-10-18T10:00:00Z',
        endsAt: '2026-10-18T12:00:00Z',
        status: 'DECLINED' as const,
      },
      {
        id: 'asg-2',
        startsAt: '2026-10-18T10:00:00Z',
        endsAt: '2026-10-18T12:00:00Z',
        status: 'SUBSTITUTED' as const,
      },
    ];

    expect(findConflictingAssignment(candidateSlot, assignments)).toBeNull();
  });

  it('retorna o objeto de atribuição conflitante e suporta ignoreAssignmentId', () => {
    const candidateSlot = {
      startsAt: '2026-10-18T09:00:00Z',
      endsAt: '2026-10-18T11:00:00Z',
    };
    const conflicting = {
      id: 'asg-active',
      startsAt: '2026-10-18T10:00:00Z',
      endsAt: '2026-10-18T12:00:00Z',
      status: 'CONFIRMED' as const,
    };

    // Sem ignorar, detecta o conflito
    expect(findConflictingAssignment(candidateSlot, [conflicting])).toEqual(conflicting);

    // Ignorando outro ID, continua detectando conflito
    expect(findConflictingAssignment(candidateSlot, [conflicting], 'outro-id')).toEqual(conflicting);

    // Ignorando o próprio ID, não há conflito
    expect(findConflictingAssignment(candidateSlot, [conflicting], 'asg-active')).toBeNull();
  });
});

describe('Motor de Escala: Limite Diário (Máx 2 por dia)', () => {
  it('constante MAX_DAILY_ASSIGNMENTS é estritamente 2 e DEFAULT_TIMEZONE é America/Sao_Paulo', () => {
    expect(MAX_DAILY_ASSIGNMENTS).toBe(2);
    expect(DEFAULT_TIMEZONE).toBe('America/Sao_Paulo');
  });

  describe('getLocalDateString', () => {
    it('formata strings ISO e objetos Date no padrão YYYY-MM-DD no fuso padrão', () => {
      expect(getLocalDateString('2026-10-18T15:00:00Z')).toBe('2026-10-18');
      expect(getLocalDateString(new Date('2026-10-18T15:00:00Z'))).toBe('2026-10-18');
    });

    it('respeita o fuso horário para transições de meia-noite', () => {
      // 01:00 UTC do dia 18 corresponde a 22:00 do dia 17 em São Paulo (UTC-3)
      expect(getLocalDateString('2026-10-18T01:00:00Z', 'America/Sao_Paulo')).toBe('2026-10-17');
      expect(getLocalDateString('2026-10-18T01:00:00Z', 'UTC')).toBe('2026-10-18');
    });

    it('lança erro em caso de datas malformadas ou inválidas', () => {
      expect(() => getLocalDateString('data-invalida')).toThrow('Data inválida para cálculo de limite diário');
      expect(() => getLocalDateString(new Date('invalid'))).toThrow('Data inválida para cálculo de limite diário');
    });
  });

  describe('countDailyAssignments', () => {
    it('retorna 0 para lista de atribuições vazia', () => {
      expect(countDailyAssignments('2026-10-18T10:00:00-03:00', [])).toBe(0);
    });

    it('conta corretamente 1, 2 e 3 atribuições no mesmo dia', () => {
      const a1 = { id: '1', startsAt: '2026-10-18T09:00:00-03:00', endsAt: '2026-10-18T10:00:00-03:00', status: 'CONFIRMED' as const };
      const a2 = { id: '2', startsAt: '2026-10-18T14:00:00-03:00', endsAt: '2026-10-18T15:00:00-03:00', status: 'PENDING' as const };
      const a3 = { id: '3', startsAt: '2026-10-18T19:00:00-03:00', endsAt: '2026-10-18T20:00:00-03:00', status: 'CONFIRMED' as const };

      expect(countDailyAssignments('2026-10-18T12:00:00-03:00', [a1])).toBe(1);
      expect(countDailyAssignments('2026-10-18T12:00:00-03:00', [a1, a2])).toBe(2);
      expect(countDailyAssignments('2026-10-18T12:00:00-03:00', [a1, a2, a3])).toBe(3);
    });

    it('ignora atribuições em outros dias do calendário', () => {
      const aDifferentDay = { id: 'diff', startsAt: '2026-10-19T09:00:00-03:00', endsAt: '2026-10-19T10:00:00-03:00', status: 'CONFIRMED' as const };
      const aSameDay = { id: 'same', startsAt: '2026-10-18T09:00:00-03:00', endsAt: '2026-10-18T10:00:00-03:00', status: 'CONFIRMED' as const };

      expect(countDailyAssignments('2026-10-18T12:00:00-03:00', [aDifferentDay])).toBe(0);
      expect(countDailyAssignments('2026-10-18T12:00:00-03:00', [aDifferentDay, aSameDay])).toBe(1);
    });

    it('respeita ignoreAssignmentId se fornecido', () => {
      const a1 = { id: 'ignore-me', startsAt: '2026-10-18T09:00:00-03:00', endsAt: '2026-10-18T10:00:00-03:00', status: 'CONFIRMED' as const };
      const a2 = { id: 'keep-me', startsAt: '2026-10-18T14:00:00-03:00', endsAt: '2026-10-18T15:00:00-03:00', status: 'CONFIRMED' as const };

      expect(countDailyAssignments('2026-10-18T12:00:00-03:00', [a1, a2], 'ignore-me')).toBe(1);
      expect(countDailyAssignments('2026-10-18T12:00:00-03:00', [a1, a2], 'other-id')).toBe(2);
    });

    it('ignora escalas com status DECLINED ou SUBSTITUTED', () => {
      const aDeclined = { id: '1', startsAt: '2026-10-18T09:00:00-03:00', endsAt: '2026-10-18T10:00:00-03:00', status: 'DECLINED' as const };
      const aSubstituted = { id: '2', startsAt: '2026-10-18T14:00:00-03:00', endsAt: '2026-10-18T15:00:00-03:00', status: 'SUBSTITUTED' as const };
      const aConfirmed = { id: '3', startsAt: '2026-10-18T19:00:00-03:00', endsAt: '2026-10-18T20:00:00-03:00', status: 'CONFIRMED' as const };

      expect(countDailyAssignments('2026-10-18T12:00:00-03:00', [aDeclined, aSubstituted])).toBe(0);
      expect(countDailyAssignments('2026-10-18T12:00:00-03:00', [aDeclined, aSubstituted, aConfirmed])).toBe(1);
    });
  });

  describe('wouldExceedDailyLimit', () => {
    it('retorna false para 0 escalas prévias no dia', () => {
      expect(wouldExceedDailyLimit('2026-10-18T12:00:00-03:00', [])).toBe(false);
    });

    it('retorna false para exatamente 1 escala prévia no dia (limite ainda não atingido)', () => {
      const assignments = [
        { id: '1', startsAt: '2026-10-18T09:00:00-03:00', endsAt: '2026-10-18T10:00:00-03:00', status: 'CONFIRMED' as const },
      ];
      expect(wouldExceedDailyLimit('2026-10-18T12:00:00-03:00', assignments)).toBe(false);
    });

    it('retorna true para exatamente 2 escalas prévias no dia (limite de 2 atingido)', () => {
      const assignments = [
        { id: '1', startsAt: '2026-10-18T09:00:00-03:00', endsAt: '2026-10-18T10:00:00-03:00', status: 'CONFIRMED' as const },
        { id: '2', startsAt: '2026-10-18T14:00:00-03:00', endsAt: '2026-10-18T15:00:00-03:00', status: 'PENDING' as const },
      ];
      expect(wouldExceedDailyLimit('2026-10-18T20:00:00-03:00', assignments)).toBe(true);
    });

    it('retorna true para 3 ou mais escalas prévias no dia', () => {
      const assignments = [
        { id: '1', startsAt: '2026-10-18T09:00:00-03:00', endsAt: '2026-10-18T10:00:00-03:00', status: 'CONFIRMED' as const },
        { id: '2', startsAt: '2026-10-18T14:00:00-03:00', endsAt: '2026-10-18T15:00:00-03:00', status: 'PENDING' as const },
        { id: '3', startsAt: '2026-10-18T17:00:00-03:00', endsAt: '2026-10-18T18:00:00-03:00', status: 'CONFIRMED' as const },
      ];
      expect(wouldExceedDailyLimit('2026-10-18T20:00:00-03:00', assignments)).toBe(true);
    });

    it('permite nova atribuição se uma das 2 anteriores for ignorada por ignoreAssignmentId', () => {
      const assignments = [
        { id: 'current-edit', startsAt: '2026-10-18T09:00:00-03:00', endsAt: '2026-10-18T10:00:00-03:00', status: 'CONFIRMED' as const },
        { id: 'other', startsAt: '2026-10-18T14:00:00-03:00', endsAt: '2026-10-18T15:00:00-03:00', status: 'PENDING' as const },
      ];
      expect(wouldExceedDailyLimit('2026-10-18T20:00:00-03:00', assignments, 'current-edit')).toBe(false);
      expect(wouldExceedDailyLimit('2026-10-18T20:00:00-03:00', assignments, 'unrelated')).toBe(true);
    });

    it('retorna false se uma das 2 escalas estiver RECUSADA ou SUBSTITUÍDA', () => {
      const assignments = [
        { id: '1', startsAt: '2026-10-18T09:00:00-03:00', endsAt: '2026-10-18T10:00:00-03:00', status: 'DECLINED' as const },
        { id: '2', startsAt: '2026-10-18T14:00:00-03:00', endsAt: '2026-10-18T15:00:00-03:00', status: 'CONFIRMED' as const },
      ];
      expect(wouldExceedDailyLimit('2026-10-18T20:00:00-03:00', assignments)).toBe(false);
    });

    it('no dia seguinte a contagem é zerada permitindo novas escalas', () => {
      const assignments = [
        { id: '1', startsAt: '2026-10-18T09:00:00-03:00', endsAt: '2026-10-18T10:00:00-03:00', status: 'CONFIRMED' as const },
        { id: '2', startsAt: '2026-10-18T14:00:00-03:00', endsAt: '2026-10-18T15:00:00-03:00', status: 'CONFIRMED' as const },
      ];
      expect(wouldExceedDailyLimit('2026-10-19T09:00:00-03:00', assignments)).toBe(false);
    });
  });
});

describe('Motor de Escala: Elegibilidade Completa', () => {
  const baseSlot: SlotRequirement = {
    id: 'slot-1',
    title: 'Louvor - Bateria',
    departmentId: 'dept-louvor',
    functionId: 'func-bateria',
    startsAt: '2026-10-18T09:00:00-03:00',
    endsAt: '2026-10-18T10:30:00-03:00',
  };

  const baseCandidate: CandidateUser = {
    id: 'user-1',
    name: 'João Silva',
    status: 'ACTIVE',
    departmentMemberships: [
      {
        departmentId: 'dept-louvor',
        functions: [{ functionId: 'func-bateria' }],
      },
      {
        departmentId: 'dept-recepcao',
        functions: [{ functionId: 'func-porta' }],
      },
    ],
    availabilities: [],
    assignments: [],
  };

  it('aprova candidato quando todas as condições são satisfeitas', () => {
    const result = checkEligibility(baseCandidate, baseSlot);
    expect(result.eligible).toBe(true);
  });

  it('rejeita voluntário com status PENDENTE', () => {
    const candidate = { ...baseCandidate, status: 'PENDING' as const };
    const result = checkEligibility(candidate, baseSlot);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('PENDING');
  });

  it('rejeita voluntário que não pertence ao departamento', () => {
    const candidate = {
      ...baseCandidate,
      departmentMemberships: [
        { departmentId: 'dept-infantil', functions: [] },
      ],
    };
    const result = checkEligibility(candidate, baseSlot);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('não pertence ao departamento');
  });

  it('rejeita voluntário que pertence ao departamento mas não tem a função exigida', () => {
    const candidate = {
      ...baseCandidate,
      departmentMemberships: [
        {
          departmentId: 'dept-louvor',
          functions: [{ functionId: 'func-guitarra' }],
        },
      ],
    };
    const result = checkEligibility(candidate, baseSlot);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('não possui a função requerida');
  });

  it('bloqueia voluntário escalado no mesmo horário em OUTRO departamento', () => {
    const candidate = {
      ...baseCandidate,
      assignments: [
        {
          id: 'asg-rec',
          departmentId: 'dept-recepcao',
          departmentName: 'Recepção',
          startsAt: '2026-10-18T08:30:00-03:00',
          endsAt: '2026-10-18T09:30:00-03:00', // Conflita com 09:00 - 10:30
          status: 'CONFIRMED' as const,
        },
      ],
    };

    const result = checkEligibility(candidate, baseSlot);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('já tem uma escala nesse horário');
  });

  it('bloqueia voluntário que já atingiu o limite de 2 escalas no dia', () => {
    const candidate = {
      ...baseCandidate,
      assignments: [
        {
          startsAt: '2026-10-18T07:00:00-03:00',
          endsAt: '2026-10-18T08:00:00-03:00',
          status: 'CONFIRMED' as const,
        },
        {
          startsAt: '2026-10-18T18:00:00-03:00',
          endsAt: '2026-10-18T19:00:00-03:00',
          status: 'CONFIRMED' as const,
        },
      ],
    };

    const result = checkEligibility(candidate, baseSlot);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Já são 2 escalas neste dia');
  });
});

describe('Motor de Escala: Ranking e Equilíbrio', () => {
  it('prioriza voluntário com menos escalas e maior tempo desde a última escala', () => {
    const userA: CandidateUser = { id: 'user-a', name: 'Alice', status: 'ACTIVE', departmentMemberships: [] };
    const userB: CandidateUser = { id: 'user-b', name: 'Bruno', status: 'ACTIVE', departmentMemberships: [] };
    const userC: CandidateUser = { id: 'user-c', name: 'Carla', status: 'ACTIVE', departmentMemberships: [] };

    const stats = [
      { candidate: userA, assignmentsLast60Days: 4, lastAssignmentDate: new Date('2026-10-10') },
      { candidate: userB, assignmentsLast60Days: 1, lastAssignmentDate: new Date('2026-09-01') },
      { candidate: userC, assignmentsLast60Days: 1, lastAssignmentDate: new Date('2026-10-01') },
    ];

    const ranked = rankCandidates(stats);
    // userB tem 1 escala e a última foi em 01/09 (há mais tempo que userC em 01/10)
    expect(ranked[0]?.id).toBe('user-b');
    expect(ranked[1]?.id).toBe('user-c');
    expect(ranked[2]?.id).toBe('user-a');
  });
});

describe('Motor de Escala: Clonagem de Programa', () => {
  it('clona slots preservando os horários e durações para a nova data', () => {
    const originalSlots = [
      {
        title: 'Boas-vindas',
        departmentId: 'dept-rec',
        functionId: 'func-porta',
        startsAt: '2026-10-11T09:00:00.000Z',
        endsAt: '2026-10-11T10:30:00.000Z',
        requiredCount: 2,
      },
    ];

    const cloned = cloneSlotsForNewDate(originalSlots, '2026-10-18');
    expect(cloned).toHaveLength(1);
    const slot = cloned[0]!;

    const newStart = new Date(slot.startsAt);
    const newEnd = new Date(slot.endsAt);

    expect(newStart.getUTCDate()).toBe(18);
    expect(newStart.getUTCHours()).toBe(9);
    expect(newEnd.getUTCDate()).toBe(18);
    expect(newEnd.getUTCHours()).toBe(10);
    expect(newEnd.getUTCMinutes()).toBe(30);
  });
});
