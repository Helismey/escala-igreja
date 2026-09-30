import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { can, maskPhoneNumber, maskEmail } from '@escala-igreja/domain';
import { CanaisClient } from './CanaisClient';

export default async function CanaisPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const allowed = can(userContext, 'church:settings:update');

  if (!allowed) {
    redirect('/');
  }

  // 1. Busca feature flags atuais
  const flags = await prisma.featureFlag.findMany();
  const flagMap: Record<string, boolean> = {};
  for (const f of flags) {
    flagMap[f.key] = f.enabled;
  }

  // 2. Busca histórico recente de notificações para monitoramento
  const recentLogs = await prisma.notificationLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: 20,
    include: {
      assignment: {
        include: {
          user: {
            select: { name: true, phonePrimary: true, email: true },
          },
          slot: {
            select: { title: true, department: { select: { name: true } } },
          },
        },
      },
    },
  });

  const serializedLogs = recentLogs.map((l) => ({
    id: l.id,
    kind: l.kind,
    channel: l.channel,
    success: l.success,
    error: l.error,
    sentAt: l.sentAt.toISOString(),
    recipientName: l.assignment?.user.name || 'Destinatário',
    recipientContact: l.channel === 'WHATSAPP' || l.channel === 'SMS'
      ? maskPhoneNumber(l.assignment?.user.phonePrimary)
      : maskEmail(l.assignment?.user.email),
    slotDescription: l.assignment
      ? `${l.assignment.slot.department.name} (${l.assignment.slot.title})`
      : 'Disparo direto',
  }));

  // 3. Voluntários ativos para o formulário de teste
  const activeUsers = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, email: true, phonePrimary: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">
          Canais de Envio e Notificações
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Gerencie o envio de mensagens (WhatsApp, E-mail, Web Push e SMS), controle feature flags e acompanhe a entrega.
        </p>
      </div>

      <CanaisClient
        initialFlags={flagMap}
        recentLogs={serializedLogs}
        activeUsers={activeUsers}
      />
    </div>
  );
}
