import { describe, it, expect } from 'vitest';
import {
  findBestSubstituteCandidate,
  diagnoseUnavailabilityReason,
} from '../src/scheduling/auto-substitution.js';
import { CandidateUser, SlotRequirement } from '../src/scheduling/eligibility.js';

describe('Motor de Substituição Automática', () => {
  const slot: SlotRequirement = {
    id: 'slot-1',
    departmentId: 'dept-musica',
    functionId: 'func-violao',
    startsAt: new Date('2026-10-18T10:00:00Z'),
    endsAt: new Date('2026-10-18T12:00:00Z'),
  };

  const createVolunteer = (id: string, name: string, status: 'ACTIVE' | 'PENDING' = 'ACTIVE'): CandidateUser => ({
    id,
    name,
    status,
    departmentMemberships: [
      {
        departmentId: 'dept-musica',
        functions: [{ functionId: 'func-violao' }],
      },
    ],
    availabilities: [],
    assignments: [],
  });

  it('deve selecionar o melhor substituto elegível excluindo quem desmarcou', () => {
    const v1 = createVolunteer('u1', 'Carlos');
    const v2 = createVolunteer('u2', 'Maria');
    const v3 = createVolunteer('u3', 'João');

    const statsMap = new Map([
      ['u2', { assignmentsLast60Days: 2, lastAssignmentDate: new Date('2026-10-01T10:00:00Z') }],
      ['u3', { assignmentsLast60Days: 0, lastAssignmentDate: null }], // Prioridade por nunca ter servido nos últimos 60 dias
    ]);

    const result = findBestSubstituteCandidate({
      candidates: [v1, v2, v3],
      slot,
      declinedUserIds: ['u1'], // Carlos desmarcou
      statsMap,
    });

    expect(result.candidate).not.toBeNull();
    expect(result.candidate?.id).toBe('u3'); // João tem menor número de escalas
    expect(result.eligibleCount).toBe(2);
  });

  it('deve retornar nulo e diagnóstico claro quando nenhum candidato for elegível', () => {
    const v1 = createVolunteer('u1', 'Carlos');
    // Carlos desmarcou e era o único
    const result = findBestSubstituteCandidate({
      candidates: [v1],
      slot,
      declinedUserIds: ['u1'],
    });

    expect(result.candidate).toBeNull();
    expect(result.eligibleCount).toBe(0);
    expect(result.diagnosis).toContain('já recusou');
  });

  it('deve diagnosticar conflitos de horário e limites diários', () => {
    const vConflito: CandidateUser = {
      ...createVolunteer('u2', 'Ana'),
      assignments: [
        {
          id: 'as-outro',
          startsAt: new Date('2026-10-18T10:30:00Z'),
          endsAt: new Date('2026-10-18T11:30:00Z'),
          departmentName: 'Recepção',
          programTitle: 'Culto Matutino',
        },
      ],
    };

    const vLimite: CandidateUser = {
      ...createVolunteer('u3', 'Beto'),
      assignments: [
        {
          id: 'as-1',
          startsAt: new Date('2026-10-18T08:00:00Z'),
          endsAt: new Date('2026-10-18T09:30:00Z'),
        },
        {
          id: 'as-2',
          startsAt: new Date('2026-10-18T18:00:00Z'),
          endsAt: new Date('2026-10-18T20:00:00Z'),
        },
      ],
    };

    const diagnosis = diagnoseUnavailabilityReason({
      candidates: [vConflito, vLimite],
      slot,
      declinedUserIds: [],
    });

    expect(diagnosis).toContain('conflito de horário');
    expect(diagnosis).toContain('limite diário');
  });

  it('deve reprocessar escalas após desvinculação departamental: seleciona substituto do departamento e ignora membro desvinculado', () => {
    // Membro desvinculado (não tem mais departamento ou foi retirado)
    const unlinkedUser = createVolunteer('unlinked-user', 'Membro Desvinculado');
    // Substituto qualificado com o departamento e função
    const validSubstitute = createVolunteer('sub-1', 'Substituto Disponível');
    // Membro inativo que não deve ser selecionado
    const inactiveUser = createVolunteer('inactive-user', 'Membro Inativo', 'PENDING');

    const result = findBestSubstituteCandidate({
      candidates: [unlinkedUser, validSubstitute, inactiveUser],
      slot,
      declinedUserIds: [unlinkedUser.id], // ID do membro desvinculado passado na lista de declinados
    });

    expect(result.candidate).not.toBeNull();
    expect(result.candidate?.id).toBe('sub-1');
    expect(result.candidate?.name).toBe('Substituto Disponível');
    expect(result.eligibleCount).toBe(1);
  });
});
