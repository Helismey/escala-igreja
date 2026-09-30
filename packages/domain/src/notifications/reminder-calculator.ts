export type ReminderKind = 'D7' | 'D2' | 'D1';

export interface AssignmentForReminder {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhonePrimary?: string | null;
  preferredChannel: 'WHATSAPP' | 'EMAIL' | 'PUSH' | 'SMS';
  optOutWhatsapp: boolean;
  optOutEmail: boolean;
  optOutPush: boolean;
  optOutSms: boolean;
  startsAt: Date | string;
  endsAt: Date | string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'SUBSTITUTED';
  programTitle: string;
  departmentName: string;
  functionName?: string | null;
}

export interface ExistingNotificationLog {
  assignmentId: string;
  kind: ReminderKind;
  success: boolean;
}

export interface PendingReminder {
  assignment: AssignmentForReminder;
  kind: ReminderKind;
}

/**
 * Calcula se a data de início da escala cai em alguma das janelas de lembrete:
 * - D-7: entre 168h e 192h antes do culto (7 a 8 dias)
 * - D-2: entre 48h e 72h antes do culto (2 a 3 dias)
 * - D-1: entre 24h e 48h antes do culto (1 a 2 dias)
 */
export function calculateReminderKind(
  startsAt: Date | string,
  referenceDate: Date | string = new Date()
): ReminderKind | null {
  const startMs = new Date(startsAt).getTime();
  const refMs = new Date(referenceDate).getTime();
  const diffHours = (startMs - refMs) / (1000 * 60 * 60);

  if (diffHours >= 168 && diffHours < 192) {
    return 'D7';
  }
  if (diffHours >= 48 && diffHours < 72) {
    return 'D2';
  }
  if (diffHours >= 24 && diffHours < 48) {
    return 'D1';
  }

  return null;
}

/**
 * Identifica escalas pendentes de lembrete com garantia rigorosa de idempotência.
 */
export function identifyPendingReminders(
  assignments: AssignmentForReminder[],
  sentLogs: ExistingNotificationLog[],
  referenceDate: Date | string = new Date()
): PendingReminder[] {
  const sentSet = new Set(
    sentLogs
      .filter((l) => l.success)
      .map((l) => `${l.assignmentId}:${l.kind}`)
  );

  const pending: PendingReminder[] = [];

  for (const asg of assignments) {
    // Escalas canceladas ou substituídas não geram lembretes
    if (asg.status === 'DECLINED' || asg.status === 'SUBSTITUTED') {
      continue;
    }

    const kind = calculateReminderKind(asg.startsAt, referenceDate);
    if (!kind) {
      continue;
    }

    const key = `${asg.id}:${kind}`;
    if (sentSet.has(key)) {
      // Idempotência: já foi enviado com sucesso anteriormente
      continue;
    }

    pending.push({
      assignment: asg,
      kind,
    });
  }

  return pending;
}
