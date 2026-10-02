import React from 'react';
import { getOpenSlotsWithSuggestions } from '@revezo/db';
import { getSession, getCurrentUserContext, getActiveChurchContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { can } from '@revezo/domain';
import { SlotsAbertosClient } from './SlotsAbertosClient';

export default async function SlotsAbertosPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const { activeChurch } = await getActiveChurchContext();

  const allowed = can(userContext, 'assignment:create');
  if (!allowed) {
    redirect('/');
  }

  const isAdmin = userContext?.globalRole === 'ADMIN_MASTER';
  const isPastor = userContext?.globalRole === 'PASTOR';
  const isElder = userContext?.globalRole === 'ELDER';
  const canViewAllInChurch = isAdmin || isPastor || isElder;

  const managedDeptIds = canViewAllInChurch
    ? undefined
    : userContext?.departmentMemberships
        .filter((m) => m.role === 'MANAGER')
        .map((m) => m.departmentId) || [];

  const openSlots = await getOpenSlotsWithSuggestions(managedDeptIds, activeChurch?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">
          Painel de Vagas Abertas
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Acompanhe vagas não preenchidas ou desmarcadas e veja sugestões inteligentes de voluntários disponíveis.
        </p>
      </div>

      <SlotsAbertosClient initialSlots={openSlots} />
    </div>
  );
}
