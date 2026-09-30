import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { AprovacoesClient, PendingUser, DepartmentWithFunctions } from './AprovacoesClient';
import { can } from '@escala-igreja/domain';

export default async function AprovacoesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const allowed = can(userContext, 'registration:approve');

  if (!allowed) {
    redirect('/');
  }

  const pending = await prisma.user.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });

  const isAdmin = userContext?.globalRole === 'ADMIN_MASTER';
  const managedDeptIds =
    userContext?.departmentMemberships
      .filter((m) => m.role === 'MANAGER')
      .map((m) => m.departmentId) || [];

  const departments = await prisma.department.findMany({
    where: isAdmin ? undefined : { id: { in: managedDeptIds } },
    include: { functions: true },
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
          Analise as solicitações de novos voluntários e vincule-os aos seus departamentos e funções.
        </p>
      </div>

      <AprovacoesClient
        pendingUsers={serializedPending}
        departments={serializedDepartments}
      />
    </div>
  );
}
