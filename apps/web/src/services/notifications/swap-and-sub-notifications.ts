import { prisma, createConfirmationTokenWithAudit } from '@escala-igreja/db';
import {
  renderSubstitutionNoticeMessage,
  renderSwapRequestNoticeMessage,
  renderSwapApprovedNoticeMessage,
} from '@escala-igreja/domain';
import { notificationDispatcher } from './dispatcher';

function getBaseUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

/**
 * Dispara notificação imediata quando um voluntário é escalado automaticamente como substituto.
 */
export async function notifyAutoSubstitution(params: {
  substituteAssignmentId: string;
  originalAssignmentId?: string;
  reason?: string | null;
  actorId?: string;
}): Promise<void> {
  const { substituteAssignmentId, reason, actorId } = params;

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: substituteAssignmentId },
      include: {
        user: true,
        slot: {
          include: {
            program: true,
            department: true,
            function: true,
          },
        },
      },
    });

    if (!assignment || assignment.user.status !== 'ACTIVE') {
      return;
    }

    const baseUrl = getBaseUrl();

    // 1. Gera token seguro de confirmação para o substituto
    const tokenRes = await createConfirmationTokenWithAudit({
      assignmentId: assignment.id,
      maxDays: 7,
      actorId: actorId || 'SYSTEM_AUTO_SUB',
      baseUrl,
    });

    const confirmationUrl = `${baseUrl}/confirmar/${tokenRes.rawToken}`;

    // 2. Renderiza mensagem amigável no domínio
    const message = renderSubstitutionNoticeMessage({
      volunteerName: assignment.user.name,
      programTitle: assignment.slot.program.title,
      departmentName: assignment.slot.department.name,
      functionName: assignment.slot.function?.name,
      startsAt: assignment.slot.startsAt,
      endsAt: assignment.slot.endsAt,
      confirmationUrl,
      reason,
    });

    // 3. Despacha respeitando consentimento/opt-out e preferência de canal
    await notificationDispatcher.dispatch({
      recipient: {
        userId: assignment.user.id,
        name: assignment.user.name,
        email: assignment.user.email,
        phonePrimary: assignment.user.phonePrimary,
        preferredChannel: assignment.user.preferredChannel as any,
        optOutWhatsapp: assignment.user.optOutWhatsapp,
        optOutEmail: assignment.user.optOutEmail,
        optOutPush: assignment.user.optOutPush,
        optOutSms: assignment.user.optOutSms,
      },
      message,
      assignmentId: assignment.id,
      kind: 'SUBSTITUTION',
    });
  } catch (err: unknown) {
    console.error('Erro ao despachar notificação de substituição automática:', err);
  }
}

/**
 * Notifica o voluntário-alvo de um pedido direto de troca de escala.
 */
export async function notifySwapRequested(params: {
  swapRequestId: string;
}): Promise<void> {
  const { swapRequestId } = params;

  try {
    const swap = await prisma.swapRequest.findUnique({
      where: { id: swapRequestId },
      include: {
        requester: true,
        targetUser: true,
        assignment: {
          include: {
            slot: {
              include: {
                program: true,
                department: true,
                function: true,
              },
            },
          },
        },
      },
    });

    if (!swap || !swap.targetUser || swap.targetUser.status !== 'ACTIVE') {
      return;
    }

    const baseUrl = getBaseUrl();
    const swapsUrl = `${baseUrl}/trocas`;

    const message = renderSwapRequestNoticeMessage({
      targetVolunteerName: swap.targetUser.name,
      requesterName: swap.requester.name,
      programTitle: swap.assignment.slot.program.title,
      departmentName: swap.assignment.slot.department.name,
      functionName: swap.assignment.slot.function?.name,
      startsAt: swap.assignment.slot.startsAt,
      endsAt: swap.assignment.slot.endsAt,
      swapsUrl,
      reason: swap.reason,
    });

    await notificationDispatcher.dispatch({
      recipient: {
        userId: swap.targetUser.id,
        name: swap.targetUser.name,
        email: swap.targetUser.email,
        phonePrimary: swap.targetUser.phonePrimary,
        preferredChannel: swap.targetUser.preferredChannel as any,
        optOutWhatsapp: swap.targetUser.optOutWhatsapp,
        optOutEmail: swap.targetUser.optOutEmail,
        optOutPush: swap.targetUser.optOutPush,
        optOutSms: swap.targetUser.optOutSms,
      },
      message,
      assignmentId: swap.assignmentId,
      kind: 'D1',
    });
  } catch (err: unknown) {
    console.error('Erro ao notificar solicitação de troca:', err);
  }
}

/**
 * Notifica os voluntários envolvidos quando a troca for aprovada pela liderança.
 */
export async function notifySwapApproved(params: {
  swapRequestId: string;
}): Promise<void> {
  const { swapRequestId } = params;

  try {
    const swap = await prisma.swapRequest.findUnique({
      where: { id: swapRequestId },
      include: {
        requester: true,
        targetUser: true,
        assignment: {
          include: {
            slot: {
              include: {
                program: true,
                department: true,
                function: true,
              },
            },
          },
        },
      },
    });

    if (!swap || !swap.targetUser) {
      return;
    }

    const baseUrl = getBaseUrl();
    const scheduleUrl = `${baseUrl}/minha-escala`;

    // 1. Notifica o voluntário que assumiu a escala (targetUser)
    const targetMsg = renderSwapApprovedNoticeMessage({
      volunteerName: swap.targetUser.name,
      partnerName: swap.requester.name,
      programTitle: swap.assignment.slot.program.title,
      departmentName: swap.assignment.slot.department.name,
      functionName: swap.assignment.slot.function?.name,
      startsAt: swap.assignment.slot.startsAt,
      endsAt: swap.assignment.slot.endsAt,
      scheduleUrl,
    });

    await notificationDispatcher.dispatch({
      recipient: {
        userId: swap.targetUser.id,
        name: swap.targetUser.name,
        email: swap.targetUser.email,
        phonePrimary: swap.targetUser.phonePrimary,
        preferredChannel: swap.targetUser.preferredChannel as any,
        optOutWhatsapp: swap.targetUser.optOutWhatsapp,
        optOutEmail: swap.targetUser.optOutEmail,
        optOutPush: swap.targetUser.optOutPush,
        optOutSms: swap.targetUser.optOutSms,
      },
      message: targetMsg,
      assignmentId: swap.assignmentId,
      kind: 'D1',
    });

    // 2. Notifica o voluntário que pediu a troca (requester) confirmando a liberação
    const requesterMsg = renderSwapApprovedNoticeMessage({
      volunteerName: swap.requester.name,
      partnerName: swap.targetUser.name,
      programTitle: swap.assignment.slot.program.title,
      departmentName: swap.assignment.slot.department.name,
      functionName: swap.assignment.slot.function?.name,
      startsAt: swap.assignment.slot.startsAt,
      endsAt: swap.assignment.slot.endsAt,
      scheduleUrl,
    });

    await notificationDispatcher.dispatch({
      recipient: {
        userId: swap.requester.id,
        name: swap.requester.name,
        email: swap.requester.email,
        phonePrimary: swap.requester.phonePrimary,
        preferredChannel: swap.requester.preferredChannel as any,
        optOutWhatsapp: swap.requester.optOutWhatsapp,
        optOutEmail: swap.requester.optOutEmail,
        optOutPush: swap.requester.optOutPush,
        optOutSms: swap.requester.optOutSms,
      },
      message: requesterMsg,
      assignmentId: swap.assignmentId,
      kind: 'D1',
    });
  } catch (err: unknown) {
    console.error('Erro ao notificar aprovação de troca:', err);
  }
}
