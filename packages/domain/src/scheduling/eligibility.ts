import { findConflictingAssignment, TimeSlot, UserAssignmentTime } from './conflict.js';
import { wouldExceedDailyLimit } from './daily-limit.js';
import { isDateInUnavailablePeriods, matchesPreferredWeekdays } from './availability.js';

export interface UserAvailability {
  kind: 'PREFERRED_WEEKDAY' | 'UNAVAILABLE_PERIOD';
  weekday?: number | null; // 0-6 (0 = Domingo)
  from?: Date | string | null;
  to?: Date | string | null;
}

export interface CandidateUser {
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
  departmentMemberships: {
    departmentId: string;
    functions: { functionId: string }[];
  }[];
  availabilities?: UserAvailability[];
  assignments?: UserAssignmentTime[];
}

export interface SlotRequirement extends TimeSlot {
  id: string;
  departmentId: string;
  functionId?: string | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  conflictingAssignment?: UserAssignmentTime | null;
}

/**
 * Avalia se um voluntário é elegível para ser escalado em um slot.
 */
export function checkEligibility(
  candidate: CandidateUser,
  slot: SlotRequirement,
  ignoreAssignmentId?: string
): EligibilityResult {
  // 1. Status da conta deve ser ACTIVE
  if (candidate.status !== 'ACTIVE') {
    return {
      eligible: false,
      reason: `Voluntário com status ${candidate.status} não pode ser escalado.`,
    };
  }

  // 2. Pertencimento ao departamento
  const membership = candidate.departmentMemberships.find(
    (m) => m.departmentId === slot.departmentId
  );
  if (!membership) {
    return {
      eligible: false,
      reason: 'O voluntário não pertence ao departamento deste slot.',
    };
  }

  // 3. Função requerida (se o slot especificar uma função)
  if (slot.functionId) {
    const hasFunction = membership.functions.some((f) => f.functionId === slot.functionId);
    if (!hasFunction) {
      return {
        eligible: false,
        reason: 'O voluntário não possui a função requerida para esta escala.',
      };
    }
  }

  // 4. Períodos de indisponibilidade
  if (candidate.availabilities) {
    const unavailablePeriods = candidate.availabilities
      .filter((av) => av.kind === 'UNAVAILABLE_PERIOD' && av.from && av.to)
      .map((av) => ({ from: av.from, to: av.to }));

    if (isDateInUnavailablePeriods(slot.startsAt, slot.endsAt, unavailablePeriods)) {
      return {
        eligible: false,
        reason: 'O voluntário marcou indisponibilidade neste período.',
      };
    }

    // 5. Preferência de dia da semana (se houver pelo menos uma cadastrada, deve bater com uma delas)
    const preferredDays = candidate.availabilities
      .filter((av) => av.kind === 'PREFERRED_WEEKDAY' && typeof av.weekday === 'number')
      .map((av) => av.weekday as number);

    if (!matchesPreferredWeekdays(slot.startsAt, preferredDays)) {
      return {
        eligible: false,
        reason: 'O dia da semana desta escala não está nas preferências do voluntário.',
      };
    }
  }

  // 6. Conflito de horário com qualquer departamento
  const assignments = candidate.assignments ?? [];
  const conflict = findConflictingAssignment(slot, assignments, ignoreAssignmentId);
  if (conflict) {
    return {
      eligible: false,
      conflictingAssignment: conflict,
      reason: `Não foi possível escalar ${candidate.name}. Ela(e) já tem uma escala nesse horário. Escolha outra pessoa ou ajuste o horário.`,
    };
  }

  // 7. Limite diário de 2 escalas por pessoa
  if (wouldExceedDailyLimit(slot.startsAt, assignments, ignoreAssignmentId)) {
    return {
      eligible: false,
      reason: `Não foi possível escalar ${candidate.name}. Já são 2 escalas neste dia. Escolha outra pessoa.`,
    };
  }

  return { eligible: true };
}
