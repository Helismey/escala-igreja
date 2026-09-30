/**
 * Motor de Escala: Detecção de conflitos de horário.
 * Regra: inicioA < fimB && inicioB < fimA.
 * Horários contíguos (ex.: 09:00–10:00 e 10:00–11:00) NÃO entram em conflito.
 */

export interface TimeSlot {
  startsAt: Date | string;
  endsAt: Date | string;
}

export interface UserAssignmentTime {
  id?: string;
  slotId?: string;
  departmentId?: string;
  departmentName?: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'SUBSTITUTED';
}

/**
 * Verifica se dois intervalos de tempo se sobrepõem.
 */
export function hasTimeOverlap(
  startA: Date | string,
  endA: Date | string,
  startB: Date | string,
  endB: Date | string
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  if (isNaN(sA) || isNaN(eA) || isNaN(sB) || isNaN(eB)) {
    throw new Error('Data inválida para cálculo de sobreposição');
  }

  if (sA >= eA || sB >= eB) {
    throw new Error('Horário de início deve ser anterior ao horário de término');
  }

  return sA < eB && sB < eA;
}

/**
 * Verifica se o voluntário possui conflito de horário com alguma escala já ativa.
 * Ignora escalas canceladas/recusadas (DECLINED / SUBSTITUTED).
 */
export function findConflictingAssignment(
  candidateSlot: TimeSlot,
  existingAssignments: UserAssignmentTime[],
  ignoreAssignmentId?: string
): UserAssignmentTime | null {
  for (const assignment of existingAssignments) {
    if (ignoreAssignmentId && assignment.id === ignoreAssignmentId) {
      continue;
    }

    if (assignment.status === 'DECLINED' || assignment.status === 'SUBSTITUTED') {
      continue;
    }

    if (hasTimeOverlap(candidateSlot.startsAt, candidateSlot.endsAt, assignment.startsAt, assignment.endsAt)) {
      return assignment;
    }
  }

  return null;
}
