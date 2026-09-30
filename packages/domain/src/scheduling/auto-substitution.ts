import {
  CandidateUser,
  SlotRequirement,
  checkEligibility,
} from './eligibility.js';
import { rankCandidates, CandidateStats } from './ranking.js';
import { findConflictingAssignment } from './conflict.js';
import { wouldExceedDailyLimit } from './daily-limit.js';
import { isDateInUnavailablePeriods, matchesPreferredWeekdays } from './availability.js';

export interface AutoSubstitutionOptions {
  candidates: CandidateUser[];
  slot: SlotRequirement;
  declinedUserIds?: string[];
  statsMap?: Map<string, { assignmentsLast60Days: number; lastAssignmentDate?: Date | null }>;
}

export interface AutoSubstitutionResult {
  candidate: CandidateUser | null;
  eligibleCount: number;
  diagnosis?: string;
}

/**
 * Diagnostica detalhadamente em pt-BR por que os voluntários não puderam assumir o slot.
 */
export function diagnoseUnavailabilityReason(options: {
  candidates: CandidateUser[];
  slot: SlotRequirement;
  declinedUserIds?: string[];
}): string {
  const { candidates, slot, declinedUserIds = [] } = options;

  if (candidates.length === 0) {
    return 'Nenhum voluntário cadastrado neste departamento ou função.';
  }

  let declinedCount = 0;
  let conflictCount = 0;
  let dailyLimitCount = 0;
  let periodUnavailableCount = 0;
  let weekdayNotPreferredCount = 0;
  let missingFunctionCount = 0;
  let inactiveCount = 0;

  for (const c of candidates) {
    if (declinedUserIds.includes(c.id)) {
      declinedCount++;
      continue;
    }

    if (c.status !== 'ACTIVE') {
      inactiveCount++;
      continue;
    }

    const membership = c.departmentMemberships.find((m) => m.departmentId === slot.departmentId);
    if (!membership) {
      continue;
    }

    if (slot.functionId && !membership.functions.some((f) => f.functionId === slot.functionId)) {
      missingFunctionCount++;
      continue;
    }

    if (c.availabilities) {
      const unavailable = c.availabilities
        .filter((av) => av.kind === 'UNAVAILABLE_PERIOD' && av.from && av.to)
        .map((av) => ({ from: av.from, to: av.to }));

      if (isDateInUnavailablePeriods(slot.startsAt, slot.endsAt, unavailable)) {
        periodUnavailableCount++;
        continue;
      }

      const preferredDays = c.availabilities
        .filter((av) => av.kind === 'PREFERRED_WEEKDAY' && typeof av.weekday === 'number')
        .map((av) => av.weekday as number);

      if (!matchesPreferredWeekdays(slot.startsAt, preferredDays)) {
        weekdayNotPreferredCount++;
        continue;
      }
    }

    if (c.assignments) {
      const conflict = findConflictingAssignment(slot, c.assignments);
      if (conflict) {
        conflictCount++;
        continue;
      }

      if (wouldExceedDailyLimit(slot.startsAt, c.assignments)) {
        dailyLimitCount++;
        continue;
      }
    }
  }

  const parts: string[] = [];
  if (declinedCount > 0) parts.push(`${declinedCount} voluntário(s) já recusou esta vaga`);
  if (conflictCount > 0) parts.push(`${conflictCount} com conflito de horário`);
  if (dailyLimitCount > 0) parts.push(`${dailyLimitCount} atingiram o limite diário de 2 escalas`);
  if (periodUnavailableCount > 0) parts.push(`${periodUnavailableCount} marcaram período de indisponibilidade`);
  if (weekdayNotPreferredCount > 0) parts.push(`${weekdayNotPreferredCount} sem preferência para este dia`);
  if (missingFunctionCount > 0) parts.push(`${missingFunctionCount} sem a função requerida`);
  if (inactiveCount > 0) parts.push(`${inactiveCount} com cadastro pendente ou inativo`);

  if (parts.length === 0) {
    return 'Nenhum candidato apto encontrado para esta escala.';
  }

  return `Não há voluntários disponíveis: ${parts.join(', ')}.`;
}

/**
 * Encontra o melhor candidato para substituição automática de um slot.
 */
export function findBestSubstituteCandidate(options: AutoSubstitutionOptions): AutoSubstitutionResult {
  const { candidates, slot, declinedUserIds = [], statsMap } = options;

  // 1. Filtrar candidatos não excluídos que atendam aos requisitos
  const eligibleCandidates = candidates.filter((c) => {
    if (declinedUserIds.includes(c.id)) {
      return false;
    }
    const check = checkEligibility(c, slot);
    return check.eligible;
  });

  if (eligibleCandidates.length === 0) {
    const diagnosis = diagnoseUnavailabilityReason({ candidates, slot, declinedUserIds });
    return {
      candidate: null,
      eligibleCount: 0,
      diagnosis,
    };
  }

  // 2. Mapear estatísticas de participação para ranqueamento
  const candidateStats: CandidateStats[] = eligibleCandidates.map((candidate) => {
    const stats = statsMap?.get(candidate.id);
    return {
      candidate,
      assignmentsLast60Days: stats?.assignmentsLast60Days ?? 0,
      lastAssignmentDate: stats?.lastAssignmentDate ?? null,
    };
  });

  // 3. Ordenar com o motor de ranking oficial (menor carga e maior tempo de descanso)
  const ranked = rankCandidates(candidateStats);

  return {
    candidate: ranked[0] ?? null,
    eligibleCount: ranked.length,
  };
}
