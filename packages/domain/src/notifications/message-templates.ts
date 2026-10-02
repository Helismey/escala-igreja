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
 * Opções para envelopar conteúdo em layout de e-mail responsivo e com rodapé LGPD.
 */
export interface EmailLayoutOptions {
  title: string;
  previewText?: string;
  contentHtml: string;
  churchName?: string;
  appUrl?: string;
}

/**
 * Envelopa o conteúdo HTML em um template responsivo de e-mail compatível com
 * clientes móveis e desktop (Gmail, Outlook, iOS Mail) incluindo rodapé de transparência LGPD.
 */
export function wrapEmailHtmlLayout(options: EmailLayoutOptions): string {
  const churchTitle = options.churchName || 'Revezo';
  const preview = options.previewText || options.title;

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${options.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #1E293B;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td {
      padding: 0;
    }
    .preview-text {
      display: none;
      font-size: 1px;
      line-height: 1px;
      max-height: 0px;
      max-width: 0px;
      opacity: 0;
      overflow: hidden;
      mso-hide: all;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        border-radius: 0 !important;
      }
      .content {
        padding: 24px 16px !important;
      }
      .btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #F8FAFC;">
  <span class="preview-text">${preview}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC;">
    <tr>
      <td align="center" style="padding: 12px;">
        <table role="presentation" class="container" width="100%" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);" cellpadding="0" cellspacing="0" border="0">
          <!-- Header Institucional -->
          <tr>
            <td style="background-color: #0F4C5C; padding: 24px 28px; text-align: left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.02em;">
                      ${churchTitle}
                    </span>
                    <span style="display: block; font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">
                      Sistema de Escalas Ministeriais
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Conteúdo Principal -->
          <tr>
            <td class="content" style="padding: 32px 28px; font-size: 15px; line-height: 1.6; color: #1E293B;">
              ${options.contentHtml}
            </td>
          </tr>
          <!-- Rodapé de Transparência LGPD -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 28px; font-size: 12px; line-height: 1.6; color: #64748B;">
              <p style="margin: 0 0 10px 0;">
                Esta notificação foi enviada pelo <strong>${churchTitle}</strong> através do sistema Revezo.
              </p>
              <p style="margin: 0 0 10px 0;">
                <strong>Privacidade &amp; LGPD:</strong> Em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados), seus dados cadastrais são tratados exclusivamente para viabilizar e organizar as escalas voluntárias e atividades ministeriais da igreja.
              </p>
              <p style="margin: 0 0 10px 0;">
                Para atualizar seus dados, gerenciar preferências de comunicação ou exercer seus direitos de titular, acesse o painel 'Minha Escala' no aplicativo ou procure a secretaria/liderança da congregação.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 12px;">
                &copy; ${new Date().getFullYear()} ${churchTitle} &bull; Revezo
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

    const contentHtml = `
      <h2 style="color: #0F4C5C; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Olá, ${firstName}!</h2>
      <p style="margin: 0 0 12px 0;">Lembrando que amanhã você está escalado(a) no <strong>${options.departmentName}</strong>${roleName}.</p>
      <div style="background-color: #F1F5F9; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 6px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Horário:</strong> ${timeStr}</p>
        <p style="margin: 4px 0;"><strong>Culto:</strong> ${options.programTitle}</p>
        <p style="margin: 4px 0; color: #059669; font-weight: bold;">✓ Sua presença já está confirmada.</p>
      </div>
      <p style="margin: 16px 0 12px 0;">Se tiver algum imprevisto de última hora, avise o gestor pelo link abaixo:</p>
      <p style="margin: 20px 0;">
        <a href="${confirmationUrl}" class="btn" style="display: inline-block; padding: 12px 24px; background-color: #475569; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Avisar imprevisto
        </a>
      </p>
      <p style="margin: 16px 0 0 0; color: #64748B;">Deus abençoe seu ministério!</p>
    `;

    const bodyHtml = wrapEmailHtmlLayout({
      title: subject,
      previewText: `Lembrete: você serve amanhã em ${options.departmentName}`,
      contentHtml,
    });

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

  const contentHtml = `
    <h2 style="color: #0F4C5C; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Olá, ${firstName}!</h2>
    <p style="margin: 0 0 12px 0;">Você está escalado(a) para servir na equipe de <strong>${options.departmentName}</strong>${roleName}.</p>
    <div style="background-color: #F1F5F9; border-left: 4px solid #0F4C5C; padding: 14px 18px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>Data:</strong> ${dateStr}</p>
      <p style="margin: 4px 0;"><strong>Horário:</strong> ${timeStr}</p>
      <p style="margin: 4px 0;"><strong>Culto:</strong> ${options.programTitle}</p>
    </div>
    <p style="margin: 16px 0 12px 0;">Por favor, confirme se poderá comparecer:</p>
    <p style="margin: 20px 0;">
      <a href="${confirmationUrl}" class="btn" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Confirmar presença
      </a>
    </p>
    <p style="font-size: 13px; color: #64748B; margin-top: 20px;">
      Não poderá comparecer? Pelo mesmo link você pode desmarcar com antecedência para alertar seu gestor.
    </p>
  `;

  const bodyHtml = wrapEmailHtmlLayout({
    title: subject,
    previewText: `Confirmação de escala em ${options.departmentName} (${windowLabel})`,
    contentHtml,
  });

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

  const contentHtml = `
    <h2 style="color: #0F4C5C; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Olá, ${firstName}!</h2>
    <p style="margin: 0 0 12px 0;">Houve um imprevisto na equipe e você foi escalado(a) automaticamente para servir em <strong>${options.departmentName}</strong>${roleName}.</p>
    <div style="background-color: #F1F5F9; border-left: 4px solid #0F4C5C; padding: 14px 18px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>Data:</strong> ${dateStr}</p>
      <p style="margin: 4px 0;"><strong>Horário:</strong> ${timeStr}</p>
      <p style="margin: 4px 0;"><strong>Culto:</strong> ${options.programTitle}</p>
    </div>
    <p style="margin: 16px 0 12px 0;">Por favor, confirme se você poderá assumir essa vaga:</p>
    <p style="margin: 20px 0;">
      <a href="${confirmationUrl}" class="btn" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Confirmar presença
      </a>
    </p>
    <p style="font-size: 13px; color: #64748B; margin-top: 20px;">
      Não tem disponibilidade? Use o mesmo link para desmarcar para que outro irmão possa ser acionado a tempo.
    </p>
  `;

  const bodyHtml = wrapEmailHtmlLayout({
    title: subject,
    previewText: `Você foi escalado(a) como substituto(a) em ${options.departmentName}`,
    contentHtml,
  });

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

  const contentHtml = `
    <h2 style="color: #0F4C5C; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Olá, ${targetFirstName}!</h2>
    <p style="margin: 0 0 12px 0;"><strong>${options.requesterName}</strong> solicitou uma troca de escala com você em <strong>${options.departmentName}</strong>${roleName}.</p>
    <div style="background-color: #F1F5F9; border-left: 4px solid #0F4C5C; padding: 14px 18px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>Data:</strong> ${dateStr}</p>
      <p style="margin: 4px 0;"><strong>Horário:</strong> ${timeStr}</p>
      <p style="margin: 4px 0;"><strong>Culto:</strong> ${options.programTitle}</p>
      ${options.reason ? `<p style="margin: 4px 0; color: #475569;"><strong>Motivo:</strong> ${options.reason}</p>` : ''}
    </div>
    <p style="margin: 16px 0 12px 0;">Acesse o painel para responder ao pedido:</p>
    <p style="margin: 20px 0;">
      <a href="${options.swapsUrl}" class="btn" style="display: inline-block; padding: 12px 24px; background-color: #0F4C5C; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Responder pedido de troca
      </a>
    </p>
  `;

  const bodyHtml = wrapEmailHtmlLayout({
    title: subject,
    previewText: `${options.requesterName} solicitou uma troca de escala em ${options.departmentName}`,
    contentHtml,
  });

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

  const contentHtml = `
    <h2 style="color: #0F4C5C; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Olá, ${firstName}!</h2>
    <p style="margin: 0 0 12px 0;">A troca de escala entre você e <strong>${options.partnerName}</strong> em <strong>${options.departmentName}</strong>${roleName} foi <strong style="color: #059669;">aprovada</strong> pela liderança.</p>
    <div style="background-color: #F1F5F9; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>Data:</strong> ${dateStr}</p>
      <p style="margin: 4px 0;"><strong>Horário:</strong> ${timeStr}</p>
      <p style="margin: 4px 0;"><strong>Culto:</strong> ${options.programTitle}</p>
    </div>
    <p style="margin: 20px 0;">
      <a href="${options.scheduleUrl}" class="btn" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Acessar Minha Escala
      </a>
    </p>
  `;

  const bodyHtml = wrapEmailHtmlLayout({
    title: subject,
    previewText: `Sua troca de escala em ${options.departmentName} foi aprovada`,
    contentHtml,
  });

  return {
    subject,
    title: subject,
    bodyText,
    bodyHtml,
    actionUrl: options.scheduleUrl,
    actionText: 'Ver escala',
  };
}

export interface RenderRegistrationApprovedOptions {
  volunteerName: string;
  departmentName: string;
  churchName: string;
  loginUrl: string;
}

/**
 * Renderiza mensagem avisando que o cadastro do voluntário foi aprovado.
 */
export function renderRegistrationApprovedMessage(options: RenderRegistrationApprovedOptions): RenderedMessage {
  const firstName = options.volunteerName.trim().split(' ')[0] || 'Voluntário(a)';
  const subject = `Cadastro aprovado: seja bem-vindo(a) ao Revezo (${options.churchName})`;

  const bodyText = [
    `Olá, ${firstName}!`,
    ``,
    `Seu cadastro na congregação ${options.churchName} foi aprovado para o ministério de ${options.departmentName}.`,
    `Você já pode acessar o sistema com seu e-mail e senha para visualizar suas escalas e registrar suas disponibilidades:`,
    options.loginUrl,
    ``,
    `Deus abençoe seu ministério!`,
  ].join('\n');

  const contentHtml = `
    <h2 style="color: #059669; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Cadastro Aprovado!</h2>
    <p style="margin: 0 0 12px 0;">Olá, <strong>${firstName}</strong>!</p>
    <p style="margin: 0 0 12px 0;">Seu cadastro na congregação <strong>${options.churchName}</strong> foi aprovado com sucesso para atuar no ministério de <strong>${options.departmentName}</strong>.</p>
    <p style="margin: 16px 0 12px 0;">Acesse o portal para conferir suas escalas e registrar suas disponibilidades:</p>
    <p style="margin: 20px 0;">
      <a href="${options.loginUrl}" class="btn" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Acessar o Sistema
      </a>
    </p>
    <p style="font-size: 13px; color: #64748B; margin-top: 16px;">
      Em caso de dúvidas sobre suas funções, procure o gestor do seu departamento.
    </p>
  `;

  const bodyHtml = wrapEmailHtmlLayout({
    title: subject,
    previewText: `Seu cadastro no ministério ${options.departmentName} foi aprovado`,
    churchName: options.churchName,
    contentHtml,
  });

  return {
    subject,
    title: subject,
    bodyText,
    bodyHtml,
    actionUrl: options.loginUrl,
    actionText: 'Acessar o Sistema',
  };
}

export interface RenderRegistrationRejectedOptions {
  volunteerName: string;
  churchName: string;
  reason?: string | null;
}

/**
 * Renderiza mensagem informando a recusa do cadastro do voluntário.
 */
export function renderRegistrationRejectedMessage(options: RenderRegistrationRejectedOptions): RenderedMessage {
  const firstName = options.volunteerName.trim().split(' ')[0] || 'Irmão(ã)';
  const subject = `Atualização sobre sua solicitação de cadastro (${options.churchName})`;

  const reasonLine = options.reason ? `Motivo informado pela liderança: "${options.reason}"` : '';

  const bodyText = [
    `Olá, ${firstName}.`,
    ``,
    `Sua solicitação de cadastro na congregação ${options.churchName} não pôde ser aprovada neste momento.`,
    reasonLine,
    ``,
    `Para mais esclarecimentos ou orientações pastorais, por favor entre em contato diretamente com a secretaria ou liderança da sua igreja.`,
  ].filter(Boolean).join('\n');

  const contentHtml = `
    <h2 style="color: #334155; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Solicitação de Cadastro</h2>
    <p style="margin: 0 0 12px 0;">Olá, <strong>${firstName}</strong>.</p>
    <p style="margin: 0 0 12px 0;">Sua solicitação de cadastro na congregação <strong>${options.churchName}</strong> não pôde ser aprovada neste momento.</p>
    ${options.reason ? `<div style="background-color: #F1F5F9; border-left: 4px solid #94A3B8; padding: 14px 18px; border-radius: 6px; margin: 16px 0;"><p style="margin: 0; color: #475569;"><strong>Motivo informado:</strong> ${options.reason}</p></div>` : ''}
    <p style="font-size: 14px; color: #475569; margin-top: 16px;">
      Para mais esclarecimentos ou orientações, por favor procure diretamente a secretaria ou a liderança pastoral da congregação.
    </p>
  `;

  const bodyHtml = wrapEmailHtmlLayout({
    title: subject,
    previewText: `Atualização sobre sua solicitação de cadastro em ${options.churchName}`,
    churchName: options.churchName,
    contentHtml,
  });

  return {
    subject,
    title: subject,
    bodyText,
    bodyHtml,
  };
}

