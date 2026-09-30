export interface OriginalSlot {
  title: string;
  departmentId: string;
  functionId?: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  requiredCount: number;
}

export interface ClonedSlot {
  title: string;
  departmentId: string;
  functionId?: string | null;
  startsAt: string; // ISO string
  endsAt: string;   // ISO string
  requiredCount: number;
}

/**
 * Calcula os novos horários dos slots de um programa ao cloná-lo para uma nova data (YYYY-MM-DD).
 * Mantém os horários (hora, minuto) originais de cada parte/slot.
 */
export function cloneSlotsForNewDate(
  slots: OriginalSlot[],
  targetDateString: string // ex: "2026-10-18"
): ClonedSlot[] {
  const [targetYear, targetMonth, targetDay] = targetDateString.split('-').map(Number);
  if (!targetYear || !targetMonth || !targetDay) {
    throw new Error('Data de destino inválida. Use o formato AAAA-MM-DD.');
  }

  return slots.map((slot) => {
    const origStart = new Date(slot.startsAt);
    const origEnd = new Date(slot.endsAt);

    // Ajusta o ano, mês e dia mantendo a hora, minuto, segundo e milissegundo originais
    const newStart = new Date(origStart);
    newStart.setFullYear(targetYear, targetMonth - 1, targetDay);

    // Calcula a duração do slot original em milissegundos para garantir que a duração seja idêntica
    const durationMs = origEnd.getTime() - origStart.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    return {
      title: slot.title,
      departmentId: slot.departmentId,
      functionId: slot.functionId,
      startsAt: newStart.toISOString(),
      endsAt: newEnd.toISOString(),
      requiredCount: slot.requiredCount,
    };
  });
}
