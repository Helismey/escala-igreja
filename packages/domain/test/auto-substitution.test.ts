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

  describe('Diagnóstico de Indisponibilidade detalhado', () => {
    it('retorna mensagem específica quando não há candidatos cadastrados', () => {
      const diagnosis = diagnoseUnavailabilityReason({
        candidates: [],
        slot,
      });
      expect(diagnosis).toBe('Nenhum voluntário cadastrado neste departamento ou função.');
    });

    it('retorna mensagem padrão quando nenhum filtro específico pontua (ex: departamento diferente)', () => {
      const vOutroDepto: CandidateUser = {
        ...createVolunteer('u-outro', 'Outro'),
        departmentMemberships: [
          {
            departmentId: 'dept-limpeza',
            functions: [],
          },
        ],
      };
      const diagnosis = diagnoseUnavailabilityReason({
        candidates: [vOutroDepto],
        slot,
      });
      expect(diagnosis).toBe('Nenhum candidato apto encontrado para esta escala.');
    });

    it('diagnostica candidatos inativos, sem função requerida, com indisponibilidade de período e sem preferência de dia', () => {
      const vInativo = createVolunteer('u-inativo', 'Inativo', 'PENDING');

      const vSemFuncao: CandidateUser = {
        ...createVolunteer('u-sem-func', 'Sem Função'),
        departmentMemberships: [
          {
            departmentId: 'dept-musica',
            functions: [{ functionId: 'func-bateria' }], // precisa de func-violao
          },
        ],
      };

      const vPeriodoIndisp: CandidateUser = {
        ...createVolunteer('u-indisp', 'Indisponível'),
        availabilities: [
          {
            id: 'av-1',
            kind: 'UNAVAILABLE_PERIOD',
            from: new Date('2026-10-17T00:00:00Z'),
            to: new Date('2026-10-19T23:59:59Z'),
          },
        ],
      };

      // 2026-10-18 é domingo (weekday = 0)
      const vDiaNaoPreferido: CandidateUser = {
        ...createVolunteer('u-dia', 'Prefere Quarta'),
        availabilities: [
          {
            id: 'av-2',
            kind: 'PREFERRED_WEEKDAY',
            weekday: 3, // quarta-feira
          },
        ],
      };

      const vRecusou = createVolunteer('u-recusou', 'Recusou');

      const diagnosis = diagnoseUnavailabilityReason({
        candidates: [vInativo, vSemFuncao, vPeriodoIndisp, vDiaNaoPreferido, vRecusou],
        slot,
        declinedUserIds: ['u-recusou'],
      });

      expect(diagnosis).toContain('1 voluntário(s) já recusou esta vaga');
      expect(diagnosis).toContain('1 com cadastro pendente ou inativo');
      expect(diagnosis).toContain('1 sem a função requerida');
      expect(diagnosis).toContain('1 marcaram período de indisponibilidade');
      expect(diagnosis).toContain('1 sem preferência para este dia');
      expect(diagnosis).toMatch(/^Não há voluntários disponíveis: .*\.$/);
    });

    it('findBestSubstituteCandidate suporta options sem declinedUserIds e sem statsMap', () => {
      const v1 = createVolunteer('u1', 'Carlos');
      const v2 = createVolunteer('u2', 'Maria');

      // Sem passar declinedUserIds nem statsMap
      const result = findBestSubstituteCandidate({
        candidates: [v1, v2],
        slot,
      });

      expect(result.candidate).not.toBeNull();
      expect(result.eligibleCount).toBe(2);
    });

    it('findBestSubstituteCandidate lida com statsMap parcial onde estatísticas são undefined ou zero', () => {
      const v1 = createVolunteer('u1', 'Carlos');
      const v2 = createVolunteer('u2', 'Maria');

      const statsMap = new Map([
        ['u1', { assignmentsLast60Days: 0, lastAssignmentDate: null }],
      ]);

      const result = findBestSubstituteCandidate({
        candidates: [v1, v2],
        slot,
        statsMap,
      });

      expect(result.candidate).not.toBeNull();
      expect(result.eligibleCount).toBe(2);
    });
  });
});
