import { describe, expect, it } from 'vitest';
import {
  hasTimeOverlap,
  findConflictingAssignment,
  countDailyAssignments,
  wouldExceedDailyLimit,
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

  it('horários contíguos (encostados: término de um = início do outro) NÃO entram em conflito', () => {
    // A: 09:00 - 10:00, B: 10:00 - 11:00
    expect(hasTimeOverlap('2026-10-18T09:00:00Z', '2026-10-18T10:00:00Z', '2026-10-18T10:00:00Z', '2026-10-18T11:00:00Z')).toBe(false);
  });

  it('horários completamente separados NÃO entram em conflito', () => {
    expect(hasTimeOverlap('2026-10-18T08:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T14:00:00Z', '2026-10-18T16:00:00Z')).toBe(false);
  });

  it('ignora escalas recusadas (DECLINED) ao verificar conflito', () => {
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
    ];

    expect(findConflictingAssignment(candidateSlot, assignments)).toBeNull();
  });
});

describe('Motor de Escala: Limite Diário (Máx 2 por dia)', () => {
  it('permite a 1ª e a 2ª escala no mesmo dia, mas bloqueia a 3ª', () => {
    const assignments = [
      {
        id: 'asg-1',
        startsAt: '2026-10-18T09:00:00-03:00',
        endsAt: '2026-10-18T10:30:00-03:00',
        status: 'CONFIRMED' as const,
      },
      {
        id: 'asg-2',
        startsAt: '2026-10-18T18:00:00-03:00',
        endsAt: '2026-10-18T19:30:00-03:00',
        status: 'PENDING' as const,
      },
    ];

    expect(countDailyAssignments('2026-10-18T20:00:00-03:00', assignments)).toBe(2);
    expect(wouldExceedDailyLimit('2026-10-18T20:00:00-03:00', assignments)).toBe(true);

    // No dia seguinte, a contagem é zerada
    expect(countDailyAssignments('2026-10-19T09:00:00-03:00', assignments)).toBe(0);
    expect(wouldExceedDailyLimit('2026-10-19T09:00:00-03:00', assignments)).toBe(false);
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
