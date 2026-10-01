import {
  CandidateUser,
  SlotRequirement,
  checkEligibility,
} from './eligibility.js';
import { rankCandidates, CandidateStats } from './ranking.js';
import { diagnoseUnavailabilityReason } from './auto-substitution.js';
import { UserAssignmentTime } from './conflict.js';

export interface AutoScheduleSlotInput extends SlotRequirement {
  title: string;
  requiredCount: number;
  currentAssignments: { userId: string }[];
}

export interface CandidateWithHistory extends CandidateUser {
  assignmentsLast60Days: number;
  lastAssignmentDate?: Date | null;
}

export interface GeneratedAssignmentProposal {
  slotId: string;
  slotTitle: string;
  startsAt: Date | string;
  endsAt: Date | string;
  departmentId: string;
  functionId?: string | null;
  candidate: {
    id: string;
    name: string;
    assignmentsLast60Days: number;
  };
  reason: string;
}

export interface UnfilledSlotReport {
  slotId: string;
  slotTitle: string;
  startsAt: Date | string;
  endsAt: Date | string;
  departmentId: string;
  functionId?: string | null;
  missingCount: number;
  diagnosis: string;
}

export interface AutoScheduleResult {
  proposals: GeneratedAssignmentProposal[];
  unfilledSlots: UnfilledSlotReport[];
  totalSlotsEvaluated: number;
  totalFilled: number;
}

/**
 * Gera automaticamente propostas de escalas para preencher slots em aberto.
 * Respeita:
 * 1. Elegibilidade (membro ativo do departamento, função, sem indisponibilidade no horário).
 * 2. Limite de 2 escalas por dia (fuso America/Sao_Paulo).
 * 3. Ausência de sobreposição/conflito com outras escalas já existentes ou atribuídas no mesmo lote.
 * 4. Algoritmo de justiça e rodízio: prioriza quem tem menos escalas nos últimos 60 dias.
 */
export function generateProgramSchedule(params: {
  slots: AutoScheduleSlotInput[];
  candidates: CandidateWithHistory[];
}): AutoScheduleResult {
  const { slots, candidates } = params;

  // Clona o estado de atribuições e escalas dos candidatos para simulação durante a geração
  const candidateSimulatedState = new Map<
    string,
    {
      candidate: CandidateWithHistory;
      assignments: UserAssignmentTime[];
      assignmentsLast60Days: number;
      lastAssignmentDate?: Date | null;
    }
  >();

  for (const c of candidates) {
    candidateSimulatedState.set(c.id, {
      candidate: c,
      assignments: [...(c.assignments || [])],
      assignmentsLast60Days: c.assignmentsLast60Days || 0,
      lastAssignmentDate: c.lastAssignmentDate ? new Date(c.lastAssignmentDate) : null,
    });
  }

  const proposals: GeneratedAssignmentProposal[] = [];
  const unfilledSlots: UnfilledSlotReport[] = [];

  // Ordena os slots cronologicamente para preenchimento sequencial coerente
  const sortedSlots = [...slots].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  let totalFilled = 0;

  for (const slot of sortedSlots) {
    // Quantas vagas ainda precisam ser preenchidas neste slot
    const alreadyAssignedCount = slot.currentAssignments.length;
    const needed = Math.max(0, slot.requiredCount - alreadyAssignedCount);

    if (needed === 0) {
      continue;
    }

    let filledForThisSlot = 0;
    // Usuários já escalados neste slot (não podem ser repetidos no mesmo slot)
    const assignedUserIdsInThisSlot = new Set(slot.currentAssignments.map((a) => a.userId));

    for (let i = 0; i < needed; i++) {
      // 1. Filtra candidatos elegíveis considerando o estado atualizado da simulação
      const eligibleList: {
        candidate: CandidateWithHistory;
        simulated: NonNullable<ReturnType<typeof candidateSimulatedState.get>>;
      }[] = [];

      for (const [candidateId, sim] of candidateSimulatedState.entries()) {
        if (assignedUserIdsInThisSlot.has(candidateId)) {
          continue;
        }

        const candidateForCheck: CandidateUser = {
          ...sim.candidate,
          assignments: sim.assignments,
        };

        const eligibility = checkEligibility(candidateForCheck, slot);
        if (eligibility.eligible) {
          eligibleList.push({
            candidate: sim.candidate,
            simulated: candidateSimulatedState.get(candidateId)!,
          });
        }
      }

      if (eligibleList.length === 0) {
        break;
      }

      // 2. Ranqueia os elegíveis usando as estatísticas atualizadas
      const candidateStats: CandidateStats[] = eligibleList.map((item) => ({
        candidate: item.candidate,
        assignmentsLast60Days: item.simulated.assignmentsLast60Days,
        lastAssignmentDate: item.simulated.lastAssignmentDate,
      }));

      const ranked = rankCandidates(candidateStats);
      const chosen = ranked[0];

      if (!chosen) {
        break;
      }

      const chosenSim = candidateSimulatedState.get(chosen.id)!;

      // 3. Registra a proposta
      const reason =
        chosenSim.assignmentsLast60Days === 0
          ? 'Nenhuma escala nos últimos 60 dias (alta prioridade de rodízio)'
          : `${chosenSim.assignmentsLast60Days} escala(s) nos últimos 60 dias`;

      proposals.push({
        slotId: slot.id,
        slotTitle: slot.title,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        departmentId: slot.departmentId,
        functionId: slot.functionId,
        candidate: {
          id: chosen.id,
          name: chosen.name,
          assignmentsLast60Days: chosenSim.assignmentsLast60Days,
        },
        reason,
      });

      // 4. Atualiza o estado simulado do candidato escolhido
      const newSimAssignment: UserAssignmentTime = {
        id: `sim-${slot.id}-${chosen.id}`,
        slotId: slot.id,
        departmentId: slot.departmentId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: 'PENDING',
      };

      chosenSim.assignments.push(newSimAssignment);
      chosenSim.assignmentsLast60Days += 1;
      chosenSim.lastAssignmentDate = new Date(slot.startsAt);
      assignedUserIdsInThisSlot.add(chosen.id);

      filledForThisSlot++;
      totalFilled++;
    }

    const remaining = needed - filledForThisSlot;
    if (remaining > 0) {
      // Gera diagnóstico explicativo em pt-BR
      const diagnosis = diagnoseUnavailabilityReason({
        candidates: Array.from(candidateSimulatedState.values()).map((s) => ({
          ...s.candidate,
          assignments: s.assignments,
        })),
        slot,
        declinedUserIds: Array.from(assignedUserIdsInThisSlot),
      });

      unfilledSlots.push({
        slotId: slot.id,
        slotTitle: slot.title,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        departmentId: slot.departmentId,
        functionId: slot.functionId,
        missingCount: remaining,
        diagnosis,
      });
    }
  }

  return {
    proposals,
    unfilledSlots,
    totalSlotsEvaluated: sortedSlots.length,
    totalFilled,
  };
}
