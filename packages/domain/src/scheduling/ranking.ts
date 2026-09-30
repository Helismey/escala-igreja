import { CandidateUser } from './eligibility.js';

export interface CandidateStats {
  candidate: CandidateUser;
  assignmentsLast60Days: number;
  lastAssignmentDate?: Date | null;
}

/**
 * Ordena os voluntários elegíveis para equilibrar a escala:
 * 1. Menor número de escalas nos últimos 60 dias.
 * 2. Maior tempo desde a última escala (quem serviu há mais tempo tem prioridade).
 * 3. Id do usuário para desempate estável e determinístico.
 */
export function rankCandidates(stats: CandidateStats[]): CandidateUser[] {
  const sorted = [...stats].sort((a, b) => {
    // 1. Menor número nos últimos 60 dias
    if (a.assignmentsLast60Days !== b.assignmentsLast60Days) {
      return a.assignmentsLast60Days - b.assignmentsLast60Days;
    }

    // 2. Quem nunca serviu ou serviu há mais tempo
    const timeA = a.lastAssignmentDate ? new Date(a.lastAssignmentDate).getTime() : 0;
    const timeB = b.lastAssignmentDate ? new Date(b.lastAssignmentDate).getTime() : 0;

    if (timeA !== timeB) {
      return timeA - timeB; // Menor timestamp = serviu há mais tempo (ou nunca serviu = 0)
    }

    // 3. Critério estável por ID
    return a.candidate.id.localeCompare(b.candidate.id);
  });

  return sorted.map((s) => s.candidate);
}
