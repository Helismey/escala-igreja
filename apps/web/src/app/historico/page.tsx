import React from 'react';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { prisma, getDepartmentParticipationReport } from '@escala-igreja/db';
import HistoricoClient from './HistoricoClient';

export default async function HistoricoPage() {
  const session = await getSession();
  const userContext = await getCurrentUserContext();

  if (!session || !userContext) {
    redirect('/login');
  }

  const isAdmin = userContext.globalRole === 'ADMIN_MASTER';
  const managedDeptIds = userContext.departmentMemberships
    .filter((m) => m.role === 'MANAGER')
    .map((m) => m.departmentId);

  if (!isAdmin && managedDeptIds.length === 0) {
    redirect('/');
  }

  const departments = await prisma.department.findMany({
    where: isAdmin ? {} : { id: { in: managedDeptIds } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const defaultDeptId = departments[0]?.id;
  const initialReport = await getDepartmentParticipationReport({
    departmentId: defaultDeptId,
  });

  return (
    <HistoricoClient
      isAdmin={isAdmin}
      departments={departments}
      initialReport={initialReport}
      initialDepartmentId={defaultDeptId || ''}
    />
  );
}
