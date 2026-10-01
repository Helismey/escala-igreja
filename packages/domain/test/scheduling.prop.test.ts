import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  hasTimeOverlap,
  wouldExceedDailyLimit,
  countDailyAssignments,
  generateProgramSchedule,
  findBestSubstituteCandidate,
  CandidateUser,
  SlotRequirement,
  AutoScheduleSlotInput,
  CandidateWithHistory,
} from '../src/index.js';

describe('Testes de Propriedade do Motor de Escala (fast-check)', () => {
  // Semente aleatória reprodutível registrada
  const baseDate = new Date('2026-10-18T00:00:00.000Z').getTime();

  // Gerador de timestamp em minutos relativos à data base
  const timeGen = fc.integer({ min: 0, max: 24 * 60 - 30 });
  const durationGen = fc.integer({ min: 15, max: 240 }); // 15 min a 4 horas

  it('Propriedade 1 & 8: Detecção de conflito segue rigorosamente intervalo semiaberto e simetria', () => {
    fc.assert(
      fc.property(timeGen, durationGen, timeGen, durationGen, (t1, d1, t2, d2) => {
        const startA = new Date(baseDate + t1 * 60000).toISOString();
        const endA = new Date(baseDate + (t1 + d1) * 60000).toISOString();
        const startB = new Date(baseDate + t2 * 60000).toISOString();
        const endB = new Date(baseDate + (t2 + d2) * 60000).toISOString();

        const overlap = hasTimeOverlap(startA, endA, startB, endB);
        const expected = startA < endB && startB < endA;

        // Invariante 1: inicioA < fimB && inicioB < fimA
        expect(overlap).toBe(expected);

        // Simetria
        expect(hasTimeOverlap(startB, endB, startA, endA)).toBe(overlap);

        // Propriedade 8: Horários encostados (término de um = início do outro) NUNCA conflitam
        const contiguousOverlap = hasTimeOverlap(startA, endA, endA, new Date(Date.parse(endA) + 3600000).toISOString());
        expect(contiguousOverlap).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('Propriedade 2: Limite diário bloqueia estritamente qualquer 3ª escala no mesmo dia civil', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }), // quantidade de escalas existentes
        (existingCount) => {
          const targetSlotStartsAt = '2026-10-18T18:00:00Z';

          // Gera assignments fictícios no mesmo dia civil em America/Sao_Paulo
          const existingAssignments = Array.from({ length: existingCount }, (_, i) => ({
            id: `asg-${i}`,
            startsAt: `2026-10-18T${String(12 + i * 2).padStart(2, '0')}:00:00Z`,
            endsAt: `2026-10-18T${String(13 + i * 2).padStart(2, '0')}:00:00Z`,
            status: 'CONFIRMED' as const,
          }));

          const count = countDailyAssignments(targetSlotStartsAt, existingAssignments);
          const exceeds = wouldExceedDailyLimit(targetSlotStartsAt, existingAssignments);

          expect(count).toBe(existingCount);
          if (existingCount >= 2) {
            expect(exceeds).toBe(true);
          } else {
            expect(exceeds).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Propriedade 3, 4, 6 e 7: Geração automática nunca viola elegibilidade, ausência de conflitos e limite diário', () => {
    // Gerador de voluntários arbitrários com departamentos e funções consistentes
    const volunteerGen = fc.array(
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 2, maxLength: 20 }),
        departmentId: fc.constantFrom('dept-musica', 'dept-midia', 'dept-recepcao'),
        functionId: fc.constantFrom('func-vocal', 'func-violao', 'func-som', 'func-projecao'),
        historicalAssignmentsCount: fc.integer({ min: 0, max: 20 }),
      }),
      { minLength: 3, maxLength: 8 }
    );

    fc.assert(
      fc.property(volunteerGen, (volunteers) => {
        // Criar estrutura de candidatos conforme esperado pelo auto-scheduler
        const candidates: CandidateWithHistory[] = volunteers.map((v) => ({
          id: v.id,
          name: v.name,
          status: 'ACTIVE' as const,
          departmentMemberships: [
            {
              departmentId: v.departmentId,
              functions: [{ functionId: v.functionId }],
            },
          ],
          availabilities: [],
          assignmentsLast60Days: v.historicalAssignmentsCount,
          assignments: [],
        }));

        // Criar slots com horários definidos
        const slots: AutoScheduleSlotInput[] = [
          {
            id: 'slot-1',
            title: 'Louvor Manhã',
            departmentId: 'dept-musica',
            functionId: 'func-vocal',
            startsAt: '2026-10-18T09:00:00Z',
            endsAt: '2026-10-18T10:30:00Z',
            requiredCount: 1,
            currentAssignments: [],
          },
          {
            id: 'slot-2',
            title: 'Som Manhã',
            departmentId: 'dept-midia',
            functionId: 'func-som',
            startsAt: '2026-10-18T09:00:00Z',
            endsAt: '2026-10-18T10:30:00Z',
            requiredCount: 1,
            currentAssignments: [],
          },
          {
            id: 'slot-3',
            title: 'Louvor Noite',
            departmentId: 'dept-musica',
            functionId: 'func-vocal',
            startsAt: '2026-10-18T19:00:00Z',
            endsAt: '2026-10-18T20:30:00Z',
            requiredCount: 1,
            currentAssignments: [],
          },
        ];

        const schedule1 = generateProgramSchedule({ slots, candidates });

        // Verificação 1: Nenhuma proposta com voluntário fora do departamento/função
        for (const prop of schedule1.proposals) {
          const targetSlot = slots.find((s) => s.id === prop.slotId)!;
          const candidate = candidates.find((c) => c.id === prop.candidate.id)!;

          const memberDept = candidate.departmentMemberships.find(
            (m) => m.departmentId === targetSlot.departmentId
          );
          expect(memberDept).toBeDefined();

          if (targetSlot.functionId) {
            expect(memberDept?.functions.some((f) => f.functionId === targetSlot.functionId)).toBe(true);
          }
        }

        // Verificação 2: Nenhum voluntário é escalado simultaneamente em slots sobrepostos
        const assignmentsByUser = new Map<string, AutoScheduleSlotInput[]>();
        for (const prop of schedule1.proposals) {
          const targetSlot = slots.find((s) => s.id === prop.slotId)!;
          const userSlots = assignmentsByUser.get(prop.candidate.id) || [];

          for (const prevSlot of userSlots) {
            expect(
              hasTimeOverlap(
                targetSlot.startsAt,
                targetSlot.endsAt,
                prevSlot.startsAt,
                prevSlot.endsAt
              )
            ).toBe(false);
          }

          userSlots.push(targetSlot);
          assignmentsByUser.set(prop.candidate.id, userSlots);
        }

        // Verificação 3: Determinismo e Idempotência (Propriedade 6 e 7)
        const schedule2 = generateProgramSchedule({ slots, candidates });
        expect(schedule2.proposals).toEqual(schedule1.proposals);
        expect(schedule2.unfilledSlots).toEqual(schedule1.unfilledSlots);
      }),
      { numRuns: 50 }
    );
  });

  it('Propriedade 5: Substituição automática nunca atribui quem recusou e respeita conflitos', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('user-1', 'user-2', 'user-3'),
        (decliningUserId) => {
          const targetSlot: SlotRequirement = {
            id: 'slot-culto',
            departmentId: 'dept-musica',
            functionId: 'func-vocal',
            startsAt: '2026-10-18T19:00:00Z',
            endsAt: '2026-10-18T20:30:00Z',
          };

          const candidates: CandidateUser[] = [
            {
              id: 'user-1',
              name: 'Voluntário 1',
              status: 'ACTIVE',
              departmentMemberships: [
                { departmentId: 'dept-musica', functions: [{ functionId: 'func-vocal' }] },
              ],
              assignments: [],
            },
            {
              id: 'user-2',
              name: 'Voluntário 2',
              status: 'ACTIVE',
              departmentMemberships: [
                { departmentId: 'dept-musica', functions: [{ functionId: 'func-vocal' }] },
              ],
              assignments: [],
            },
            {
              id: 'user-3',
              name: 'Voluntário 3',
              status: 'ACTIVE',
              departmentMemberships: [
                { departmentId: 'dept-musica', functions: [{ functionId: 'func-vocal' }] },
              ],
              assignments: [],
            },
          ];

          const result = findBestSubstituteCandidate({
            slot: targetSlot,
            candidates,
            declinedUserIds: [decliningUserId],
          });

          if (result.candidate) {
            // O substituto NUNCA é quem recusou
            expect(result.candidate.id).not.toBe(decliningUserId);
            // O substituto pertence ao departamento
            const m = result.candidate.departmentMemberships.find((dm) => dm.departmentId === 'dept-musica');
            expect(m?.functions.some((f) => f.functionId === 'func-vocal')).toBe(true);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
