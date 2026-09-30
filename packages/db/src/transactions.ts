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
  generateActionToken,
  hashActionToken,
  isActionTokenValid,
  calculateTokenExpiration,
  formatConfirmationMessage,
  validatePasswordPolicy,
  hashPassword,
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

export interface CreateConfirmationTokenParams {
  assignmentId: string;
  actorId?: string;
  ip?: string;
  maxDays?: number;
  baseUrl?: string;
}

export interface ConfirmationTokenResult {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
  assignmentId: string;
  confirmationUrl: string;
  whatsappMessage: string;
  member: {
    id: string;
    name: string;
    phonePrimary: string | null;
  };
}

export async function createConfirmationTokenWithAudit(
  params: CreateConfirmationTokenParams
): Promise<ConfirmationTokenResult> {
  const { assignmentId, actorId, ip, maxDays = 7, baseUrl = '' } = params;

  // 1. Busca dados da escala, voluntário e slot
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      user: true,
      slot: {
        include: {
          department: true,
          function: true,
          program: true,
        },
      },
    },
  });

  if (!assignment) {
    throw new Error('Escala não encontrada.');
  }

  if (assignment.user.status !== 'ACTIVE') {
    throw new Error(`Voluntário não está ativo (status atual: ${assignment.user.status}).`);
  }

  // 2. Calcula expiração com base no início da escala e limite máximo
  const expiresAt = calculateTokenExpiration(assignment.slot.startsAt, maxDays);
  const { rawToken, tokenHash } = generateActionToken();

  // 3. Persistência transacional com auditoria e revogação de tokens anteriores não usados
  await prisma.$transaction(async (tx) => {
    // Revoga tokens anteriores não utilizados para a mesma escala
    await tx.actionToken.deleteMany({
      where: {
        userId: assignment.userId,
        purpose: 'CONFIRM_ASSIGNMENT',
        refId: assignmentId,
        usedAt: null,
      },
    });

    // Insere o novo token
    await tx.actionToken.create({
      data: {
        userId: assignment.userId,
        purpose: 'CONFIRM_ASSIGNMENT',
        refId: assignmentId,
        tokenHash,
        expiresAt,
      },
    });

    // Trilha de auditoria
    await tx.auditLog.create({
      data: {
        actorId: actorId || assignment.userId,
        action: 'CONFIRMATION_TOKEN_CREATED',
        targetType: 'Assignment',
        targetId: assignmentId,
        result: 'SUCCESS',
        ip,
        meta: {
          userId: assignment.userId,
          slotId: assignment.slotId,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });
  });

  const confirmationUrl = baseUrl ? `${baseUrl}/confirmar/${rawToken}` : `/confirmar/${rawToken}`;
  const church = await prisma.churchSettings.findFirst();

  const whatsappMessage = formatConfirmationMessage({
    memberFirstName: assignment.user.name.split(' ')[0] || assignment.user.name,
    churchName: church?.name,
    programTitle: assignment.slot.program.title,
    departmentName: assignment.slot.department.name,
    functionName: assignment.slot.function?.name || assignment.slot.title,
    startsAt: assignment.slot.startsAt,
    confirmationUrl,
  });

  return {
    rawToken,
    tokenHash,
    expiresAt,
    assignmentId,
    confirmationUrl,
    whatsappMessage,
    member: {
      id: assignment.user.id,
      name: assignment.user.name,
      phonePrimary: assignment.user.phonePrimary,
    },
  };
}

export interface VerifyConfirmationTokenResult {
  valid: boolean;
  error?: 'TOKEN_NOT_FOUND' | 'ALREADY_USED' | 'EXPIRED' | 'ASSIGNMENT_NOT_FOUND';
  message?: string;
  data?: {
    token: string;
    assignmentId: string;
    status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'SUBSTITUTED';
    declinedReason: string | null;
    memberFirstName: string;
    memberFullName: string;
    programTitle: string;
    departmentName: string;
    functionName: string;
    startsAt: string;
    endsAt: string;
    expiresAt: string;
  };
}

export async function verifyConfirmationToken(rawToken: string): Promise<VerifyConfirmationTokenResult> {
  const tokenHash = hashActionToken(rawToken);

  const actionToken = await prisma.actionToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });

  if (!actionToken || actionToken.purpose !== 'CONFIRM_ASSIGNMENT' || !actionToken.refId) {
    return {
      valid: false,
      error: 'TOKEN_NOT_FOUND',
      message: 'Link de confirmação inválido ou não encontrado.',
    };
  }

  const statusCheck = isActionTokenValid({
    usedAt: actionToken.usedAt,
    expiresAt: actionToken.expiresAt,
  });

  if (!statusCheck.valid) {
    if (statusCheck.reason === 'ALREADY_USED') {
      return {
        valid: false,
        error: 'ALREADY_USED',
        message: 'Este link de confirmação já foi utilizado anteriormente.',
      };
    }
    return {
      valid: false,
      error: 'EXPIRED',
      message: 'Este link de confirmação expirou.',
    };
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: actionToken.refId },
    include: {
      slot: {
        include: {
          department: true,
          function: true,
          program: true,
        },
      },
    },
  });

  if (!assignment) {
    return {
      valid: false,
      error: 'ASSIGNMENT_NOT_FOUND',
      message: 'A escala associada a este link não foi encontrada.',
    };
  }

  return {
    valid: true,
    data: {
      token: rawToken,
      assignmentId: assignment.id,
      status: assignment.status as 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'SUBSTITUTED',
      declinedReason: assignment.declinedReason,
      memberFirstName: actionToken.user.name.split(' ')[0] || actionToken.user.name,
      memberFullName: actionToken.user.name,
      programTitle: assignment.slot.program.title,
      departmentName: assignment.slot.department.name,
      functionName: assignment.slot.function?.name || assignment.slot.title,
      startsAt: assignment.slot.startsAt.toISOString(),
      endsAt: assignment.slot.endsAt.toISOString(),
      expiresAt: actionToken.expiresAt.toISOString(),
    },
  };
}

export interface ConsumeConfirmationTokenParams {
  rawToken: string;
  action: 'CONFIRM' | 'DECLINE';
  reason?: string;
  ip?: string;
}

export async function consumeConfirmationTokenWithAudit(params: ConsumeConfirmationTokenParams) {
  const { rawToken, action, reason, ip } = params;
  const tokenHash = hashActionToken(rawToken);

  return await prisma.$transaction(async (tx) => {
    const actionToken = await tx.actionToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (!actionToken || actionToken.purpose !== 'CONFIRM_ASSIGNMENT' || !actionToken.refId) {
      await tx.auditLog.create({
        data: {
          action: 'CONFIRMATION_TOKEN_CONSUME_FAILED',
          result: 'DENIED',
          ip,
          meta: { reason: 'TOKEN_INVALIDO' },
        },
      });
      throw new Error('Link de confirmação inválido ou não encontrado.');
    }

    const check = isActionTokenValid({
      usedAt: actionToken.usedAt,
      expiresAt: actionToken.expiresAt,
    });

    if (!check.valid) {
      await tx.auditLog.create({
        data: {
          actorId: actionToken.userId,
          action: 'CONFIRMATION_TOKEN_CONSUME_FAILED',
          result: 'DENIED',
          ip,
          meta: { reason: check.reason, actionTokenId: actionToken.id },
        },
      });

      if (check.reason === 'ALREADY_USED') {
        throw new Error('Este link de confirmação já foi utilizado.');
      }
      throw new Error('Este link de confirmação expirou.');
    }

    // Marca o token como consumido
    await tx.actionToken.update({
      where: { id: actionToken.id },
      data: {
        usedAt: new Date(),
      },
    });

    // Atualiza o assignment
    const targetStatus = action === 'CONFIRM' ? 'CONFIRMED' : 'DECLINED';
    const updatedAssignment = await tx.assignment.update({
      where: { id: actionToken.refId },
      data: {
        status: targetStatus,
        declinedReason: action === 'DECLINE' ? reason || 'Imprevisto informado pelo voluntário via link' : null,
      },
      include: {
        slot: {
          include: {
            department: true,
            program: true,
          },
        },
      },
    });

    // Auditoria
    await tx.auditLog.create({
      data: {
        actorId: actionToken.userId,
        action: action === 'CONFIRM' ? 'ASSIGNMENT_CONFIRMED_VIA_TOKEN' : 'ASSIGNMENT_DECLINED_VIA_TOKEN',
        targetType: 'Assignment',
        targetId: actionToken.refId,
        result: 'SUCCESS',
        ip,
        meta: {
          actionTokenId: actionToken.id,
          reason: action === 'DECLINE' ? reason : undefined,
          programTitle: updatedAssignment.slot.program.title,
          departmentName: updatedAssignment.slot.department.name,
        },
      },
    });

    return {
      success: true,
      action,
      assignmentId: updatedAssignment.id,
      status: updatedAssignment.status,
      memberFirstName: actionToken.user.name.split(' ')[0] || actionToken.user.name,
    };
  });
}

// ---- Recuperação de Senha Segura (ActionToken) ----

export interface RequestPasswordResetParams {
  email: string;
  ip?: string;
  userAgent?: string;
}

export interface RequestPasswordResetResult {
  success: boolean;
  userFound: boolean;
  rawToken?: string;
  expiresAt?: Date;
}

/**
 * Solicita redefinição de senha com token descartável e hash em banco.
 * Proteção contra enumeração: a resposta para a API externa é idêntica.
 */
export async function requestPasswordResetToken(
  params: RequestPasswordResetParams
): Promise<RequestPasswordResetResult> {
  const normalizedEmail = params.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, status: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET_ATTEMPT_UNKNOWN_EMAIL',
        result: 'DENIED',
        ip: params.ip,
        meta: {
          emailAttempted: normalizedEmail.slice(0, 3) + '***@' + (normalizedEmail.split('@')[1] || ''),
        },
      },
    });

    return {
      success: true,
      userFound: false,
    };
  }

  // Gera token de 32 bytes (64 chars hex) e hash SHA-256
  const { rawToken, tokenHash } = generateActionToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos (Regra 10)

  await prisma.$transaction(async (tx) => {
    // Revoga/descarta tokens anteriores não utilizados do mesmo propósito
    await tx.actionToken.deleteMany({
      where: {
        userId: user.id,
        purpose: 'PASSWORD_RESET',
        usedAt: null,
      },
    });

    // Cria o novo token com hash
    await tx.actionToken.create({
      data: {
        userId: user.id,
        purpose: 'PASSWORD_RESET',
        tokenHash,
        expiresAt,
      },
    });

    // Auditoria
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        targetType: 'User',
        targetId: user.id,
        result: 'SUCCESS',
        ip: params.ip,
        meta: {
          expiresAt: expiresAt.toISOString(),
        },
      },
    });
  });

  return {
    success: true,
    userFound: true,
    rawToken,
    expiresAt,
  };
}

export interface VerifyPasswordResetTokenResult {
  valid: boolean;
  reason?: 'NOT_FOUND' | 'ALREADY_USED' | 'EXPIRED' | 'USER_INACTIVE';
  userName?: string;
}

/**
 * Verifica validade do token de redefinição de senha antes da exibição do formulário.
 */
export async function verifyPasswordResetToken(
  rawToken: string
): Promise<VerifyPasswordResetTokenResult> {
  if (!rawToken || rawToken.length < 32) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  const tokenHash = hashActionToken(rawToken);

  const actionToken = await prisma.actionToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!actionToken || actionToken.purpose !== 'PASSWORD_RESET') {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  const check = isActionTokenValid({
    usedAt: actionToken.usedAt,
    expiresAt: actionToken.expiresAt,
  });

  if (!check.valid) {
    return { valid: false, reason: check.reason };
  }

  if (actionToken.user.status !== 'ACTIVE') {
    return { valid: false, reason: 'USER_INACTIVE' };
  }

  return {
    valid: true,
    userName: actionToken.user.name.split(' ')[0] || actionToken.user.name,
  };
}

export interface ResetPasswordWithTokenParams {
  rawToken: string;
  newPassword: string;
  ip?: string;
}

export interface ResetPasswordWithTokenResult {
  success: boolean;
  userId: string;
  userName: string;
}

/**
 * Redefine a senha do usuário com consumo atômico do ActionToken e revogação de sessões anteriores.
 */
export async function resetPasswordWithToken(
  params: ResetPasswordWithTokenParams
): Promise<ResetPasswordWithTokenResult> {
  const { rawToken, newPassword, ip } = params;

  if (!rawToken || rawToken.length < 32) {
    throw new Error('Link de redefinição inválido.');
  }

  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    throw new Error(policyCheck.message || 'A senha não atende aos requisitos mínimos de segurança.');
  }

  const tokenHash = hashActionToken(rawToken);

  return await prisma.$transaction(async (tx) => {
    const actionToken = await tx.actionToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (!actionToken || actionToken.purpose !== 'PASSWORD_RESET') {
      await tx.auditLog.create({
        data: {
          action: 'PASSWORD_RESET_FAILED_INVALID_TOKEN',
          result: 'DENIED',
          ip,
        },
      });
      throw new Error('Link de redefinição inválido ou não encontrado.');
    }

    const check = isActionTokenValid({
      usedAt: actionToken.usedAt,
      expiresAt: actionToken.expiresAt,
    });

    if (!check.valid) {
      await tx.auditLog.create({
        data: {
          actorId: actionToken.userId,
          action: 'PASSWORD_RESET_FAILED',
          result: 'DENIED',
          ip,
          meta: { reason: check.reason, actionTokenId: actionToken.id },
        },
      });

      if (check.reason === 'ALREADY_USED') {
        throw new Error('Este link de redefinição já foi utilizado anteriormente.');
      }
      throw new Error('Este link de redefinição expirou. Solicite um novo link.');
    }

    if (actionToken.user.status !== 'ACTIVE') {
      throw new Error('Conta de usuário inativa ou pendente.');
    }

    const newPasswordHash = hashPassword(newPassword);

    // 1. Marca token como usado
    await tx.actionToken.update({
      where: { id: actionToken.id },
      data: { usedAt: new Date() },
    });

    // 2. Atualiza a senha e zera contadores de falha
    await tx.user.update({
      where: { id: actionToken.userId },
      data: {
        passwordHash: newPasswordHash,
        failedLogins: 0,
        lockedUntil: null,
      },
    });

    // 3. Revoga todos os refresh tokens anteriores (encerra outras sessões)
    await tx.refreshToken.updateMany({
      where: {
        userId: actionToken.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // 4. Trilha de auditoria
    await tx.auditLog.create({
      data: {
        actorId: actionToken.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        targetType: 'User',
        targetId: actionToken.userId,
        result: 'SUCCESS',
        ip,
        meta: {
          actionTokenId: actionToken.id,
        },
      },
    });

    return {
      success: true,
      userId: actionToken.userId,
      userName: actionToken.user.name,
    };
  });
}



