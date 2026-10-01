import { ReminderKind } from './reminder-calculator.js';

export interface RenderTemplateOptions {
  volunteerName: string;
  programTitle: string;
  departmentName: string;
  functionName?: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  confirmationUrl?: string;
  kind: ReminderKind;
  isAlreadyConfirmed?: boolean;
}

export interface RenderedMessage {
  subject: string;
  title: string;
  bodyText: string;
  bodyHtml: string;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Formata data e horário amigável no fuso de Brasília (America/Sao_Paulo).
 */
export function formatScheduleDateTimePtBr(startsAt: Date | string, endsAt: Date | string): {
  dateStr: string;
  timeStr: string;
} {
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  const dateStr = startDate.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const startTimeStr = startDate.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });

  const endTimeStr = endDate.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    dateStr,
    timeStr: `${startTimeStr} às ${endTimeStr}`,
  };
}

/**
 * Renderiza templates de mensagens em pt-BR de acordo com as regras de UX copy e LGPD.
 */
export function renderReminderMessage(options: RenderTemplateOptions): RenderedMessage {
  const firstName = options.volunteerName.trim().split(' ')[0] || 'Voluntário(a)';
  const { dateStr, timeStr } = formatScheduleDateTimePtBr(options.startsAt, options.endsAt);
  const roleName = options.functionName ? ` como ${options.functionName}` : '';
  const confirmationUrl = options.confirmationUrl || '';

  // 1. Caso a presença já esteja confirmada no D-1
  if (options.isAlreadyConfirmed && options.kind === 'D1') {
    const subject = `Lembrete: você serve amanhã em ${options.departmentName}`;
    const bodyText = [
      `Olá, ${firstName}!`,
      ``,
      `Lembrando que amanhã você está escalado(a) no ${options.departmentName}${roleName}.`,
      `Horário: ${timeStr}.`,
      `Culto: ${options.programTitle}.`,
      ``,
      `Sua presença já está confirmada. Caso tenha algum imprevisto de última hora, avise aqui:`,
      confirmationUrl,
      ``,
      `Deus abençoe seu ministério!`,
    ].join('\n');

    const bodyHtml = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="color: #0F4C5C;">Olá, ${firstName}!</h2>
        <p>Lembrando que amanhã você está escalado(a) no <strong>${options.departmentName}</strong>${roleName}.</p>
        <p><strong>Horário:</strong> ${timeStr} (${options.programTitle})</p>
        <p style="color: #059669; font-weight: bold;">✓ Sua presença já está confirmada.</p>
        <p>Se tiver algum imprevisto de última hora, avise o gestor pelo link abaixo:</p>
        <p><a href="${confirmationUrl}" style="display: inline-block; padding: 10px 18px; background-color: #6B7280; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Avisar imprevisto</a></p>
      </div>
    `;

    return {
      subject,
      title: subject,
      bodyText,
      bodyHtml,
      actionUrl: confirmationUrl,
      actionText: 'Ver escala',
    };
  }

  // 2. Lembrete pendente de confirmação (D-7, D-2 ou D-1 pendente)
  const windowLabel =
    options.kind === 'D1'
      ? 'amanhã'
      : options.kind === 'D2'
      ? 'em 2 dias'
      : 'na próxima semana';

  const subject = `Confirmação de escala: ${options.departmentName} (${windowLabel})`;

  const bodyText = [
    `Olá, ${firstName}!`,
    ``,
    `Você está escalado(a) para servir na equipe de ${options.departmentName}${roleName}.`,
    `Data: ${dateStr}.`,
    `Horário: ${timeStr}.`,
    `Culto: ${options.programTitle}.`,
    ``,
    `Por favor, confirme se poderá comparecer clicando no link abaixo:`,
    confirmationUrl,
    ``,
    `Se não puder ir, você também pode desmarcar pelo mesmo link para que a equipe providencie um substituto.`,
  ].join('\n');

  const bodyHtml = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="color: #0F4C5C;">Olá, ${firstName}!</h2>
      <p>Você está escalado(a) para servir na equipe de <strong>${options.departmentName}</strong>${roleName}.</p>
      <div style="background-color: #F3F4F6; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Data:</strong> ${dateStr}</p>
        <p style="margin: 4px 0;"><strong>Horário:</strong> ${timeStr}</p>
        <p style="margin: 4px 0;"><strong>Culto:</strong> ${options.programTitle}</p>
      </div>
      <p>Por favor, confirme se poderá comparecer:</p>
      <p>
        <a href="${confirmationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 8px;">
          Confirmar presença
        </a>
      </p>
      <p style="font-size: 13px; color: #6B7280; margin-top: 20px;">
        Não poderá comparecer? Pelo mesmo link você pode desmarcar com antecedência para alertar seu gestor.
      </p>
    </div>
  `;

  return {
    subject,
    title: subject,
    bodyText,
    bodyHtml,
    actionUrl: confirmationUrl,
    actionText: 'Confirmar presença',
  };
}

export interface RenderSubstitutionNoticeOptions {
  volunteerName: string;
  programTitle: string;
  departmentName: string;
  functionName?: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  confirmationUrl: string;
  reason?: string | null;
}

/**
 * Renderiza mensagem avisando voluntário de que ele foi escalado como substituto.
 */
export function renderSubstitutionNoticeMessage(options: RenderSubstitutionNoticeOptions): RenderedMessage {
  const firstName = options.volunteerName.trim().split(' ')[0] || 'Voluntário(a)';
  const { dateStr, timeStr } = formatScheduleDateTimePtBr(options.startsAt, options.endsAt);
  const roleName = options.functionName ? ` como ${options.functionName}` : '';
  const confirmationUrl = options.confirmationUrl;

  const subject = `Nova escala: você foi chamado(a) para cobrir uma vaga em ${options.departmentName}`;

  const bodyText = [
    `Olá, ${firstName}!`,
    ``,
    `Houve um imprevisto na equipe e você foi escalado(a) automaticamente para servir em ${options.departmentName}${roleName}.`,
    `Data: ${dateStr}.`,
    `Horário: ${timeStr}.`,
    `Culto: ${options.programTitle}.`,
    ``,
    `Por favor, confirme se você poderá assumir essa escala clicando no link abaixo:`,
    confirmationUrl,
    ``,
    `Caso não possa, acesse o link para desmarcar para que outro voluntário seja acionado.`,
    `Contamos com você!`,
  ].join('\n');

  const bodyHtml = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="color: #0F4C5C;">Olá, ${firstName}!</h2>
      <p>Houve um imprevisto na equipe e você foi escalado(a) automaticamente para servir em <strong>${options.departmentName}</strong>${roleName}.</p>
      <div style="background-color: #F3F4F6; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Data:</strong> ${dateStr}</p>
        <p style="margin: 4px 0;"><strong>Horário:</strong> ${timeStr}</p>
        <p style="margin: 4px 0;"><strong>Culto:</strong> ${options.programTitle}</p>
      </div>
      <p>Por favor, confirme se você poderá assumir essa vaga:</p>
      <p>
        <a href="${confirmationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Confirmar presença
        </a>
      </p>
      <p style="font-size: 13px; color: #6B7280; margin-top: 20px;">
        Não tem disponibilidade? Use o mesmo link para desmarcar para que outro irmão possa ser acionado a tempo.
      </p>
    </div>
  `;

  return {
    subject,
    title: subject,
    bodyText,
    bodyHtml,
    actionUrl: confirmationUrl,
    actionText: 'Confirmar presença',
  };
}

export interface RenderSwapRequestNoticeOptions {
  targetVolunteerName: string;
  requesterName: string;
  programTitle: string;
  departmentName: string;
  functionName?: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  swapsUrl: string;
  reason?: string | null;
}

/**
 * Renderiza mensagem para o voluntário convidado a fazer uma troca de escala.
 */
export function renderSwapRequestNoticeMessage(options: RenderSwapRequestNoticeOptions): RenderedMessage {
  const targetFirstName = options.targetVolunteerName.trim().split(' ')[0] || 'Voluntário(a)';
  const { dateStr, timeStr } = formatScheduleDateTimePtBr(options.startsAt, options.endsAt);
  const roleName = options.functionName ? ` (${options.functionName})` : '';

  const subject = `Pedido de troca de escala: ${options.requesterName} solicitou sua ajuda`;

  const bodyText = [
    `Olá, ${targetFirstName}!`,
    ``,
    `${options.requesterName} enviou um pedido de troca de escala para você no departamento ${options.departmentName}${roleName}.`,
    `Data do culto: ${dateStr}.`,
    `Horário: ${timeStr} (${options.programTitle}).`,
    options.reason ? `Motivo informado: "${options.reason}"` : '',
    ``,
    `Para aceitar ou recusar a troca, acesse o painel pelo link abaixo:`,
    options.swapsUrl,
  ].filter(Boolean).join('\n');

  const bodyHtml = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="color: #0F4C5C;">Olá, ${targetFirstName}!</h2>
      <p><strong>${options.requesterName}</strong> solicitou uma troca de escala com você em <strong>${options.departmentName}</strong>${roleName}.</p>
      <div style="background-color: #F3F4F6; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Data:</strong> ${dateStr}</p>
        <p style="margin: 4px 0;"><strong>Horário:</strong> ${timeStr}</p>
        <p style="margin: 4px 0;"><strong>Culto:</strong> ${options.programTitle}</p>
        ${options.reason ? `<p style="margin: 4px 0; color: #4B5563;"><strong>Motivo:</strong> ${options.reason}</p>` : ''}
      </div>
      <p>Acesse o painel para responder:</p>
      <p>
        <a href="${options.swapsUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0F4C5C; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Responder pedido de troca
        </a>
      </p>
    </div>
  `;

  return {
    subject,
    title: subject,
    bodyText,
    bodyHtml,
    actionUrl: options.swapsUrl,
    actionText: 'Ver pedidos de troca',
  };
}

export interface RenderSwapApprovedOptions {
  volunteerName: string;
  partnerName: string;
  programTitle: string;
  departmentName: string;
  functionName?: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  scheduleUrl: string;
}

/**
 * Renderiza mensagem avisando que a troca foi aprovada pelo gestor.
 */
export function renderSwapApprovedNoticeMessage(options: RenderSwapApprovedOptions): RenderedMessage {
  const firstName = options.volunteerName.trim().split(' ')[0] || 'Voluntário(a)';
  const { dateStr, timeStr } = formatScheduleDateTimePtBr(options.startsAt, options.endsAt);
  const roleName = options.functionName ? ` (${options.functionName})` : '';

  const subject = `Troca aprovada: escala em ${options.departmentName}`;

  const bodyText = [
    `Olá, ${firstName}!`,
    ``,
    `O gestor aprovou a troca de escala entre você e ${options.partnerName} no departamento ${options.departmentName}${roleName}.`,
    `Sua escala confirmada:`,
    `Data: ${dateStr}.`,
    `Horário: ${timeStr}.`,
    `Culto: ${options.programTitle}.`,
    ``,
    `Você pode conferir seus horários atualizados em Minha Escala:`,
    options.scheduleUrl,
  ].join('\n');

  const bodyHtml = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="color: #0F4C5C;">Olá, ${firstName}!</h2>
      <p>A troca de escala entre você e <strong>${options.partnerName}</strong> em <strong>${options.departmentName}</strong>${roleName} foi <strong style="color: #059669;">aprovada</strong> pela liderança.</p>
      <div style="background-color: #F3F4F6; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Data:</strong> ${dateStr}</p>
        <p style="margin: 4px 0;"><strong>Horário:</strong> ${timeStr}</p>
        <p style="margin: 4px 0;"><strong>Culto:</strong> ${options.programTitle}</p>
      </div>
      <p>
        <a href="${options.scheduleUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Acessar Minha Escala
        </a>
      </p>
    </div>
  `;

  return {
    subject,
    title: subject,
    bodyText,
    bodyHtml,
    actionUrl: options.scheduleUrl,
    actionText: 'Ver escala',
  };
}
