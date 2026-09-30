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
