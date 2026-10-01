import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext, getActiveChurchContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { DepartamentosClient, DepartmentDetail, ActiveUserOption } from './DepartamentosClient';

export default async function DepartamentosPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const churchContext = await getActiveChurchContext();
  const activeChurchId = churchContext?.activeChurch?.id || userContext?.churchId;

  const isAdmin = userContext?.globalRole === 'ADMIN_MASTER';
  const isPastor = userContext?.globalRole === 'PASTOR';
  const isElder = userContext?.globalRole === 'ELDER';

  const canManageAll = isAdmin || isPastor || isElder;

  const managedDepartmentIds =
    userContext?.departmentMemberships
      .filter((m) => m.role === 'MANAGER')
      .map((m) => m.departmentId) || [];

  const depts = await prisma.department.findMany({
    where: activeChurchId ? { churchId: activeChurchId } : undefined,
    include: {
      functions: {
        orderBy: { name: 'asc' },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phonePrimary: true,
            },
          },
          functions: {
            include: {
              function: true,
            },
          },
        },
        orderBy: {
          user: { name: 'asc' },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const activeUsers = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      ...(activeChurchId ? { churchId: activeChurchId } : {}),
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  const serializedDepts: DepartmentDetail[] = depts.map((d) => ({
    id: d.id,
    name: d.name,
    functions: d.functions.map((f) => ({ id: f.id, name: f.name })),
    membersCount: d.members.length,
    members: d.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.user.name,
      userEmail: m.user.email,
      role: m.role as 'MANAGER' | 'MEMBER',
      functions: m.functions.map((f) => ({ id: f.function.id, name: f.function.name })),
    })),
  }));

  const serializedActiveUsers: ActiveUserOption[] = activeUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  }));

  return (
    <DepartamentosClient
      departments={serializedDepts}
      activeUsers={serializedActiveUsers}
      isAdmin={canManageAll}
      managedDepartmentIds={managedDepartmentIds}
    />
  );
}
