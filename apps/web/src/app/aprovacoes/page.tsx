import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext, getActiveChurchContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { AprovacoesClient, PendingUser, DepartmentWithFunctions } from './AprovacoesClient';
import { can } from '@escala-igreja/domain';

export default async function AprovacoesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const churchContext = await getActiveChurchContext();
  const activeChurchId = churchContext.church?.id;

  const allowed = can(userContext, 'registration:approve', { churchId: activeChurchId });
  if (!allowed) {
    redirect('/');
  }

  const isMasterOrElder =
    userContext?.globalRole === 'ADMIN_MASTER' ||
    userContext?.globalRole === 'PASTOR' ||
    userContext?.globalRole === 'ELDER';

  const pendingWhere =
    userContext?.globalRole === 'ADMIN_MASTER'
      ? { status: 'PENDING' as const }
      : activeChurchId
      ? { status: 'PENDING' as const, churchId: activeChurchId }
      : { status: 'PENDING' as const };

  const pending = await prisma.user.findMany({
    where: pendingWhere,
    orderBy: { createdAt: 'asc' },
  });

  const managedDeptIds =
    userContext?.departmentMemberships
      .filter((m) => m.role === 'MANAGER')
      .map((m) => m.departmentId) || [];

  const deptWhere = isMasterOrElder
    ? (activeChurchId ? { OR: [{ churchId: activeChurchId }, { churchId: null }] } : undefined)
    : { id: { in: managedDeptIds } };

  const departments = await prisma.department.findMany({
    where: deptWhere,
    include: { functions: true },
    orderBy: { name: 'asc' },
  });

  const serializedPending: PendingUser[] = pending.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phonePrimary: u.phonePrimary,
    whatsapp: u.whatsapp,
    birthDate: u.birthDate?.toISOString() || null,
    createdAt: u.createdAt.toISOString(),
  }));

  const serializedDepartments: DepartmentWithFunctions[] = departments.map((d) => ({
    id: d.id,
    name: d.name,
    functions: d.functions.map((f) => ({ id: f.id, name: f.name })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Aprovações de Cadastros</h1>
        <p className="text-sm text-ink-muted mt-1">
          Analise as solicitações de novos voluntários da congregação {churchContext.church?.name ? `(${churchContext.church.name})` : ''} e vincule-os aos seus departamentos e funções.
        </p>
      </div>

      <AprovacoesClient
        pendingUsers={serializedPending}
        departments={serializedDepartments}
      />
    </div>
  );
}
