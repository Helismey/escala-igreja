import { describe, expect, it } from 'vitest';
import {
  calculateReminderKind,
  identifyPendingReminders,
  renderReminderMessage,
  renderSubstitutionNoticeMessage,
  renderSwapRequestNoticeMessage,
  renderSwapApprovedNoticeMessage,
  renderRegistrationApprovedMessage,
  renderRegistrationRejectedMessage,
  wrapEmailHtmlLayout,
  AssignmentForReminder,
  ExistingNotificationLog,
} from '../src/index.js';

describe('Notificações: Janelas de Lembrete e Idempotência', () => {
  const referenceDate = new Date('2026-10-10T08:00:00Z');

  it('calcula D7 para escalas que acontecem daqui a 7 dias (ex: 170h à frente)', () => {
    // 170 horas à frente = 7 dias e 2 horas
    const startsAt = new Date(referenceDate.getTime() + 170 * 60 * 60 * 1000);
    expect(calculateReminderKind(startsAt, referenceDate)).toBe('D7');
  });

  it('calcula D2 para escalas que acontecem daqui a 2 dias (ex: 50h à frente)', () => {
    // 50 horas à frente = 2 dias e 2 horas
    const startsAt = new Date(referenceDate.getTime() + 50 * 60 * 60 * 1000);
    expect(calculateReminderKind(startsAt, referenceDate)).toBe('D2');
  });

  it('calcula D1 para escalas que acontecem daqui a 1 dia (ex: 30h à frente)', () => {
    // 30 horas à frente = 1 dia e 6 horas
    const startsAt = new Date(referenceDate.getTime() + 30 * 60 * 60 * 1000);
    expect(calculateReminderKind(startsAt, referenceDate)).toBe('D1');
  });

  it('retorna null para escalas fora das janelas (ex: 4 dias à frente ou já passadas)', () => {
    const fourDaysAhead = new Date(referenceDate.getTime() + 96 * 60 * 60 * 1000);
    const inThePast = new Date(referenceDate.getTime() - 2 * 60 * 60 * 1000);
    expect(calculateReminderKind(fourDaysAhead, referenceDate)).toBeNull();
    expect(calculateReminderKind(inThePast, referenceDate)).toBeNull();
  });

  it('filtra e identifica lembretes pendentes respeitando a idempotência (não reenvia se já houver sucesso)', () => {
    const asgD7: AssignmentForReminder = {
      id: 'asg-d7',
      userId: 'user-1',
      userName: 'Carlos Silva',
      userEmail: 'carlos@example.com',
      preferredChannel: 'WHATSAPP',
      optOutWhatsapp: false,
      optOutEmail: false,
      optOutPush: false,
      optOutSms: true,
      startsAt: new Date(referenceDate.getTime() + 170 * 60 * 60 * 1000),
      endsAt: new Date(referenceDate.getTime() + 172 * 60 * 60 * 1000),
      status: 'PENDING',
      programTitle: 'Culto da Família',
      departmentName: 'Louvor',
      functionName: 'Vocal',
    };

    const asgD2: AssignmentForReminder = {
      id: 'asg-d2',
      userId: 'user-2',
      userName: 'Mariana Costa',
      userEmail: 'mariana@example.com',
      preferredChannel: 'EMAIL',
      optOutWhatsapp: false,
      optOutEmail: false,
      optOutPush: false,
      optOutSms: true,
      startsAt: new Date(referenceDate.getTime() + 50 * 60 * 60 * 1000),
      endsAt: new Date(referenceDate.getTime() + 52 * 60 * 60 * 1000),
      status: 'CONFIRMED',
      programTitle: 'Culto de Celebração',
      departmentName: 'Recepção',
      functionName: 'Boas-vindas',
    };

    const asgCancelled: AssignmentForReminder = {
      id: 'asg-canc',
      userId: 'user-3',
      userName: 'Felipe Santos',
      userEmail: 'felipe@example.com',
      preferredChannel: 'WHATSAPP',
      optOutWhatsapp: false,
      optOutEmail: false,
      optOutPush: false,
      optOutSms: true,
      startsAt: new Date(referenceDate.getTime() + 30 * 60 * 60 * 1000),
      endsAt: new Date(referenceDate.getTime() + 32 * 60 * 60 * 1000),
      status: 'DECLINED', // Desmarcado
      programTitle: 'Culto de Celebração',
      departmentName: 'Mídia',
      functionName: 'Projeção',
    };

    // Caso 1: Sem logs anteriores, ambos D7 e D2 devem ser identificados, mas o cancelado não
    const initialReminders = identifyPendingReminders(
      [asgD7, asgD2, asgCancelled],
      [],
      referenceDate
    );

    expect(initialReminders).toHaveLength(2);
    expect(initialReminders[0]?.assignment.id).toBe('asg-d7');
    expect(initialReminders[0]?.kind).toBe('D7');
    expect(initialReminders[1]?.assignment.id).toBe('asg-d2');
    expect(initialReminders[1]?.kind).toBe('D2');

    // Caso 2: asgD7 já possui log de sucesso em D7
    const sentLogs: ExistingNotificationLog[] = [
      { assignmentId: 'asg-d7', kind: 'D7', success: true },
    ];

    const subsequentReminders = identifyPendingReminders(
      [asgD7, asgD2, asgCancelled],
      sentLogs,
      referenceDate
    );

    // Agora apenas asgD2 deve ser retornado (idempotência de asgD7 funcionando)
    expect(subsequentReminders).toHaveLength(1);
    expect(subsequentReminders[0]?.assignment.id).toBe('asg-d2');
  });
});

describe('Notificações: Renderização de Mensagens em pt-BR', () => {
  it('renderiza lembrete para escala pendente com link de confirmação claro', () => {
    const rendered = renderReminderMessage({
      volunteerName: 'Guilherme Albuquerque',
      programTitle: 'Culto Matutino',
      departmentName: 'Sonoplastia',
      functionName: 'Mesa de Som',
      startsAt: '2026-10-18T09:00:00-03:00',
      endsAt: '2026-10-18T10:30:00-03:00',
      confirmationUrl: 'https://escala.igreja.local/confirmar/token-abc-123',
      kind: 'D7',
      isAlreadyConfirmed: false,
    });

    expect(rendered.subject).toContain('Confirmação de escala: Sonoplastia');
    expect(rendered.bodyText).toContain('Olá, Guilherme!');
    expect(rendered.bodyText).toContain('Sonoplastia como Mesa de Som');
    expect(rendered.bodyText).toContain('https://escala.igreja.local/confirmar/token-abc-123');
    expect(rendered.bodyText).toContain('desmarcar pelo mesmo link');
  });

  it('renderiza lembrete para escala já confirmada (D-1) sem cobrar confirmação', () => {
    const rendered = renderReminderMessage({
      volunteerName: 'Ana Clara Lima',
      programTitle: 'Culto Noturno',
      departmentName: 'Louvor',
      functionName: 'Teclado',
      startsAt: '2026-10-11T18:00:00-03:00',
      endsAt: '2026-10-11T19:30:00-03:00',
      confirmationUrl: 'https://escala.igreja.local/confirmar/token-xyz-789',
      kind: 'D1',
      isAlreadyConfirmed: true,
    });

    expect(rendered.subject).toContain('Lembrete: você serve amanhã em Louvor');
    expect(rendered.bodyText).toContain('Olá, Ana!');
    expect(rendered.bodyText).toContain('Sua presença já está confirmada');
    expect(rendered.bodyText).toContain('imprevisto de última hora');
  });

  it('renderiza aviso acolhedor de substituição automática com link de confirmação', () => {
    const rendered = renderSubstitutionNoticeMessage({
      volunteerName: 'Lucas Oliveira',
      programTitle: 'Culto de Jovens',
      departmentName: 'Mídia',
      functionName: 'Câmera',
      startsAt: '2026-10-15T19:00:00-03:00',
      endsAt: '2026-10-15T21:00:00-03:00',
      confirmationUrl: 'https://escala.igreja.local/confirmar/token-sub-123',
    });

    expect(rendered.subject).toContain('Nova escala: você foi chamado(a) para cobrir uma vaga em Mídia');
    expect(rendered.bodyText).toContain('Olá, Lucas!');
    expect(rendered.bodyText).toContain('Houve um imprevisto na equipe e você foi escalado(a) automaticamente');
    expect(rendered.bodyText).toContain('Mídia como Câmera');
    expect(rendered.bodyText).toContain('https://escala.igreja.local/confirmar/token-sub-123');
  });

  it('renderiza notificação de pedido de troca direcionada ao voluntário', () => {
    const rendered = renderSwapRequestNoticeMessage({
      targetVolunteerName: 'Beatriz Ramos',
      requesterName: 'Matheus Pereira',
      programTitle: 'Culto Matutino',
      departmentName: 'Diaconato',
      functionName: 'Porta Principal',
      startsAt: '2026-10-18T09:00:00-03:00',
      endsAt: '2026-10-18T11:00:00-03:00',
      swapsUrl: 'https://escala.igreja.local/trocas',
      reason: 'Viagem de trabalho inadiável',
    });

    expect(rendered.subject).toContain('Pedido de troca de escala: Matheus Pereira solicitou sua ajuda');
    expect(rendered.bodyText).toContain('Olá, Beatriz!');
    expect(rendered.bodyText).toContain('Matheus Pereira enviou um pedido de troca');
    expect(rendered.bodyText).toContain('Viagem de trabalho inadiável');
    expect(rendered.bodyText).toContain('https://escala.igreja.local/trocas');
  });

  it('renderiza notificação de troca aprovada com sucesso pela liderança', () => {
    const rendered = renderSwapApprovedNoticeMessage({
      volunteerName: 'Beatriz Ramos',
      partnerName: 'Matheus Pereira',
      programTitle: 'Culto Matutino',
      departmentName: 'Diaconato',
      functionName: 'Porta Principal',
      startsAt: '2026-10-18T09:00:00-03:00',
      endsAt: '2026-10-18T11:00:00-03:00',
      scheduleUrl: 'https://escala.igreja.local/minha-escala',
    });

    expect(rendered.subject).toContain('Troca aprovada: escala em Diaconato');
    expect(rendered.bodyText).toContain('Olá, Beatriz!');
    expect(rendered.bodyText).toContain('gestor aprovou a troca de escala entre você e Matheus Pereira');
    expect(rendered.bodyText).toContain('https://escala.igreja.local/minha-escala');
  });

  it('renderiza notificação de cadastro aprovado com link de acesso e congregação', () => {
    const rendered = renderRegistrationApprovedMessage({
      volunteerName: 'Carlos Silva',
      departmentName: 'Mídia e Transmissão',
      churchName: 'Igreja Central',
      loginUrl: 'https://escala.igreja.local/login',
    });

    expect(rendered.subject).toContain('Cadastro aprovado: seja bem-vindo(a) ao Revezo (Igreja Central)');
    expect(rendered.bodyText).toContain('Olá, Carlos!');
    expect(rendered.bodyText).toContain('Seu cadastro na congregação Igreja Central foi aprovado para o ministério de Mídia e Transmissão');
    expect(rendered.bodyText).toContain('https://escala.igreja.local/login');
    expect(rendered.actionUrl).toBe('https://escala.igreja.local/login');
  });

  it('renderiza notificação de cadastro rejeitado com motivo respeitoso', () => {
    const rendered = renderRegistrationRejectedMessage({
      volunteerName: 'Ana Souza',
      churchName: 'Igreja Central',
      reason: 'Cadastro incompleto ou duplicado',
    });

    expect(rendered.subject).toContain('Atualização sobre sua solicitação de cadastro (Igreja Central)');
    expect(rendered.bodyText).toContain('Olá, Ana.');
    expect(rendered.bodyText).toContain('Cadastro incompleto ou duplicado');
    expect(rendered.bodyText).toContain('secretaria ou liderança da sua igreja');
  });

  it('envelopa templates de e-mail com layout responsivo mobile-first e rodapé LGPD', () => {
    const rawHtml = wrapEmailHtmlLayout({
      title: 'Teste de Layout',
      previewText: 'Prévia da mensagem',
      churchName: 'Primeira Igreja Batista',
      contentHtml: '<p>Mensagem teste</p>',
    });

    expect(rawHtml).toContain('<!DOCTYPE html>');
    expect(rawHtml).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    expect(rawHtml).toContain('Primeira Igreja Batista');
    expect(rawHtml).toContain('Lei nº 13.709/2018 (Lei Geral de Proteção de Dados)');
    expect(rawHtml).toContain('Minha Escala');

    // Verifica que o renderReminderMessage gera bodyHtml envelopado no layout mestre
    const reminder = renderReminderMessage({
      volunteerName: 'Carlos Teste',
      programTitle: 'Culto Noturno',
      departmentName: 'Diaconato',
      startsAt: '2026-10-18T19:00:00-03:00',
      endsAt: '2026-10-18T21:00:00-03:00',
      confirmationUrl: 'https://escala.igreja.local/confirmar/token-test',
      kind: 'D7',
    });

    expect(reminder.bodyHtml).toContain('<!DOCTYPE html>');
    expect(reminder.bodyHtml).toContain('Diaconato');
    expect(reminder.bodyHtml).toContain('Lei nº 13.709/2018');
    expect(reminder.bodyHtml).toContain('https://escala.igreja.local/confirmar/token-test');
  });
});

