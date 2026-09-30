import { prisma } from './client.js';
import {
  findConflictingAssignment,
  wouldExceedDailyLimit,
  UserAssignmentTime,
  validateProfileDates,
  isDateInUnavailablePeriods,
  matchesPreferredWeekdays,
  validateUnavailablePeriod,
  formatWeekdayPtBr,
  getWeekdayInTimezone,
} from '@escala-igreja/domain';

export interface AssignMemberParams {
  slotId: string;
  userId: string;
  actorId?: string;
  ip?: string;
}

export async function assignMemberWithLock(params: AssignMemberParams) {
  const { slotId, userId, actorId, ip } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Busca os detalhes do slot
    const slot = await tx.programSlot.findUnique({
      where: { id: slotId },
      include: {
        department: true,
        function: true,
      },
    });

    if (!slot) {
      throw new Error('Slot da escala não encontrado');
    }

    // 2. Busca dados do usuário
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        assignments: {
          include: {
            slot: true,
          },
        },
        availabilities: true,
      },
    });

    if (!user) {
      throw new Error('Voluntário não encontrado');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error(`Voluntário não está ativo (status atual: ${user.status})`);
    }

    // 3. Verificação de períodos de indisponibilidade
    const unavailablePeriods = user.availabilities
      .filter((av) => av.kind === 'UNAVAILABLE_PERIOD' && av.from && av.to)
      .map((av) => ({ from: av.from!, to: av.to! }));

    if (isDateInUnavailablePeriods(slot.startsAt, slot.endsAt, unavailablePeriods)) {
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'ASSIGNMENT_ATTEMPT_FAILED',
          targetType: 'ProgramSlot',
          targetId: slotId,
          result: 'DENIED',
          ip,
          meta: { reason: 'INDISPONIBILIDADE_VOLUNTARIO', userId },
        },
      });

      throw new Error(
        `Não foi possível escalar ${user.name}. Ela(e) registrou indisponibilidade para este período. Escolha outra pessoa.`
      );
    }

    // 4. Verificação de preferências de dias da semana
    const preferredDays = user.availabilities
      .filter((av) => av.kind === 'PREFERRED_WEEKDAY' && typeof av.weekday === 'number')
      .map((av) => av.weekday as number);

    if (!matchesPreferredWeekdays(slot.startsAt, preferredDays)) {
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'ASSIGNMENT_ATTEMPT_FAILED',
          targetType: 'ProgramSlot',
          targetId: slotId,
          result: 'DENIED',
          ip,
          meta: { reason: 'PREFERENCIA_DIA_NAO_ATENDIDA', userId },
        },
      });

      const dayName = formatWeekdayPtBr(getWeekdayInTimezone(slot.startsAt));
      throw new Error(
        `Não foi possível escalar ${user.name}. O dia da escala (${dayName}) não está entre os dias preferidos de serviço cadastrados por ela(e).`
      );
    }

    // 5. Monta a lista de escalas ativas para validação pelas regras puras de domínio
    const activeAssignments: UserAssignmentTime[] = user.assignments.map((a) => ({
      id: a.id,
      slotId: a.slotId,
      departmentId: a.slot.departmentId,
      startsAt: a.slot.startsAt,
      endsAt: a.slot.endsAt,
      status: a.status as 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'SUBSTITUTED',
    }));

    // 6. Verificação de conflito de horário
    const conflict = findConflictingAssignment(
      { startsAt: slot.startsAt, endsAt: slot.endsAt },
      activeAssignments
    );

    if (conflict) {
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'ASSIGNMENT_ATTEMPT_FAILED',
          targetType: 'ProgramSlot',
          targetId: slotId,
          result: 'DENIED',
          ip,
          meta: { reason: 'CONFLITO_HORARIO', userId },
        },
      });

      throw new Error(
        `Não foi possível escalar ${user.name}. Ela(e) já tem uma escala nesse horário. Escolha outra pessoa ou ajuste o horário.`
      );
    }

    // 5. Verificação do limite de 2 escalas por dia
    if (wouldExceedDailyLimit(slot.startsAt, activeAssignments)) {
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'ASSIGNMENT_ATTEMPT_FAILED',
          targetType: 'ProgramSlot',
          targetId: slotId,
          result: 'DENIED',
          ip,
          meta: { reason: 'LIMITE_DIARIO_EXCEDIDO', userId },
        },
      });

      throw new Error(
        `Não foi possível escalar ${user.name}. Já são 2 escalas neste dia. Escolha outra pessoa.`
      );
    }

    // 6. Criação do Assignment
    const newAssignment = await tx.assignment.create({
      data: {
        slotId,
        userId,
        status: 'PENDING',
      },
    });

    // 7. Registro de auditoria somente-inserção
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ASSIGNMENT_CREATED',
        targetType: 'Assignment',
        targetId: newAssignment.id,
        result: 'SUCCESS',
        ip,
        meta: {
          slotId,
          userId,
          slotTitle: slot.title,
          departmentId: slot.departmentId,
        },
      },
    });

    return newAssignment;
  });
}

export interface DeclineAssignmentParams {
  assignmentId: string;
  reason?: string;
  actorId?: string;
  ip?: string;
}

export async function declineAssignmentWithAudit(params: DeclineAssignmentParams) {
  const { assignmentId, reason, actorId, ip } = params;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.assignment.update({
      where: { id: assignmentId },
      data: {
        status: 'DECLINED',
        declinedReason: reason,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ASSIGNMENT_DECLINED',
        targetType: 'Assignment',
        targetId: assignmentId,
        result: 'SUCCESS',
        ip,
        meta: { reason },
      },
    });

    return updated;
  });
}

export interface ConfirmAssignmentParams {
  assignmentId: string;
  actorId?: string;
  ip?: string;
}

export async function confirmAssignmentWithAudit(params: ConfirmAssignmentParams) {
  const { assignmentId, actorId, ip } = params;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.assignment.update({
      where: { id: assignmentId },
      data: {
        status: 'CONFIRMED',
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ASSIGNMENT_CONFIRMED',
        targetType: 'Assignment',
        targetId: assignmentId,
        result: 'SUCCESS',
        ip,
      },
    });

    return updated;
  });
}

export interface UpdateUserProfileParams {
  userId: string;
  data: {
    name?: string;
    photoUrl?: string | null;
    birthDate?: string | null;
    gender?: string | null;
    maritalStatus?: string | null;
    phonePrimary?: string;
    phoneSecondary?: string | null;
    whatsapp?: string | null;
    address?: any;
    emergencyContact?: any;
    joinedAt?: string | null;
    preferredChannel?: 'WHATSAPP' | 'EMAIL' | 'PUSH' | 'SMS';
    notes?: string | null;
    optOutWhatsapp?: boolean;
    optOutEmail?: boolean;
    optOutPush?: boolean;
    optOutSms?: boolean;
  };
  actorId?: string;
  ip?: string;
}

export async function updateUserProfileWithAudit(params: UpdateUserProfileParams) {
  const { userId, data, actorId, ip } = params;

  // Validação de datas pelo domínio
  const dateCheck = validateProfileDates(data.birthDate, data.joinedAt);
  if (!dateCheck.valid) {
    throw new Error(dateCheck.error || 'Datas de perfil inconsistentes.');
  }

  return await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error('Usuário não encontrado.');
    }

    if (existingUser.status !== 'ACTIVE') {
      throw new Error('Apenas usuários ativos podem atualizar seu perfil.');
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl || null }),
        ...(data.birthDate !== undefined && {
          birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00Z`) : null,
        }),
        ...(data.gender !== undefined && { gender: data.gender || null }),
        ...(data.maritalStatus !== undefined && { maritalStatus: data.maritalStatus || null }),
        ...(data.phonePrimary !== undefined && { phonePrimary: data.phonePrimary }),
        ...(data.phoneSecondary !== undefined && { phoneSecondary: data.phoneSecondary || null }),
        ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp || null }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.emergencyContact !== undefined && { emergencyContact: data.emergencyContact }),
        ...(data.joinedAt !== undefined && {
          joinedAt: data.joinedAt ? new Date(`${data.joinedAt}T00:00:00Z`) : null,
        }),
        ...(data.preferredChannel !== undefined && { preferredChannel: data.preferredChannel }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.optOutWhatsapp !== undefined && { optOutWhatsapp: data.optOutWhatsapp }),
        ...(data.optOutEmail !== undefined && { optOutEmail: data.optOutEmail }),
        ...(data.optOutPush !== undefined && { optOutPush: data.optOutPush }),
        ...(data.optOutSms !== undefined && { optOutSms: data.optOutSms }),
      },
    });

    // LGPD & Trilha de Auditoria: registrar apenas as chaves alteradas, sem dados pessoais em texto claro
    const updatedFields = Object.keys(data).filter(
      (k) => (data as Record<string, unknown>)[k] !== undefined
    );

    await tx.auditLog.create({
      data: {
        actorId: actorId || userId,
        action: 'USER_PROFILE_UPDATED',
        targetType: 'User',
        targetId: userId,
        result: 'SUCCESS',
        ip,
        meta: {
          camposAtualizados: updatedFields,
        },
      },
    });

    return updated;
  });
}

export interface SetPreferredWeekdaysParams {
  userId: string;
  weekdays: number[];
  actorId?: string;
  ip?: string;
}

export async function setPreferredWeekdaysWithAudit(params: SetPreferredWeekdaysParams) {
  const { userId, weekdays, actorId, ip } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Remove preferências anteriores do tipo PREFERRED_WEEKDAY
    await tx.availability.deleteMany({
      where: {
        userId,
        kind: 'PREFERRED_WEEKDAY',
      },
    });

    // 2. Insere as novas preferências
    if (weekdays.length > 0) {
      await tx.availability.createMany({
        data: weekdays.map((w) => ({
          userId,
          kind: 'PREFERRED_WEEKDAY',
          weekday: w,
        })),
      });
    }

    // 3. Trilha de auditoria somente-inserção
    await tx.auditLog.create({
      data: {
        actorId: actorId || userId,
        action: 'AVAILABILITY_PREFERENCES_UPDATED',
        targetType: 'User',
        targetId: userId,
        result: 'SUCCESS',
        ip,
        meta: {
          preferredWeekdays: weekdays,
        },
      },
    });

    return { success: true, count: weekdays.length };
  });
}

export interface AddUnavailablePeriodParams {
  userId: string;
  from: string | Date;
  to: string | Date;
  actorId?: string;
  ip?: string;
}

export async function addUnavailablePeriodWithAudit(params: AddUnavailablePeriodParams) {
  const { userId, from, to, actorId, ip } = params;

  const validation = validateUnavailablePeriod(from, to);
  if (!validation.valid) {
    throw new Error(validation.error || 'Período de indisponibilidade inválido.');
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  return await prisma.$transaction(async (tx) => {
    const created = await tx.availability.create({
      data: {
        userId,
        kind: 'UNAVAILABLE_PERIOD',
        from: fromDate,
        to: toDate,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actorId || userId,
        action: 'UNAVAILABLE_PERIOD_ADDED',
        targetType: 'Availability',
        targetId: created.id,
        result: 'SUCCESS',
        ip,
        meta: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
      },
    });

    return created;
  });
}

export interface RemoveUnavailablePeriodParams {
  userId: string;
  availabilityId: string;
  actorId?: string;
  ip?: string;
}

export async function removeUnavailablePeriodWithAudit(params: RemoveUnavailablePeriodParams) {
  const { userId, availabilityId, actorId, ip } = params;

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.availability.findUnique({
      where: { id: availabilityId },
    });

    if (!existing || existing.userId !== userId || existing.kind !== 'UNAVAILABLE_PERIOD') {
      throw new Error('Período de indisponibilidade não encontrado.');
    }

    await tx.availability.delete({
      where: { id: availabilityId },
    });

    await tx.auditLog.create({
      data: {
        actorId: actorId || userId,
        action: 'UNAVAILABLE_PERIOD_REMOVED',
        targetType: 'Availability',
        targetId: availabilityId,
        result: 'SUCCESS',
        ip,
      },
    });

    return { success: true };
  });
}

