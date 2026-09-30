import React from 'react';
import { getOpenSlotsWithSuggestions } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { can } from '@escala-igreja/domain';
import { SlotsAbertosClient } from './SlotsAbertosClient';

export default async function SlotsAbertosPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const allowed = can(userContext, 'assignment:create');

  if (!allowed) {
    redirect('/');
  }

  const isAdmin = userContext?.globalRole === 'ADMIN_MASTER';
  const managedDeptIds = isAdmin
    ? undefined
    : userContext?.departmentMemberships
        .filter((m) => m.role === 'MANAGER')
        .map((m) => m.departmentId) || [];

  const openSlots = await getOpenSlotsWithSuggestions(managedDeptIds);

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
