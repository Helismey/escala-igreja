import React from 'react';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { prisma } from '@escala-igreja/db';
import TrocasClient from './TrocasClient';

export default async function TrocasPage() {
  const session = await getSession();
  const userContext = await getCurrentUserContext();

  if (!session || !userContext) {
    redirect('/login');
  }

  const userId = session.userId;
  const isAdmin = userContext.globalRole === 'ADMIN_MASTER';
  const managedDeptIds = userContext.departmentMemberships
    .filter((m) => m.role === 'MANAGER')
    .map((m) => m.departmentId);

  const myDeptIds = userContext.departmentMemberships.map((m) => m.departmentId);
  const now = new Date();

  // 1. Minhas escalas futuras para o seletor de nova troca
  const myFutureAssignments = await prisma.assignment.findMany({
    where: {
      userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      slot: { startsAt: { gte: now } },
    },
    include: {
      slot: {
        include: {
          program: true,
          department: true,
          function: true,
        },
      },
    },
    orderBy: { slot: { startsAt: 'asc' } },
  });

  // 2. Voluntários ativos dos mesmos departamentos (para seleção de substituto)
  const potentialTargets = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      id: { not: userId },
      memberships: {
        some: {
          departmentId: { in: myDeptIds },
        },
      },
    },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      memberships: {
        select: {
          departmentId: true,
          functions: { select: { functionId: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <TrocasClient
      userId={userId}
      isAdmin={isAdmin}
      isManager={managedDeptIds.length > 0}
      myFutureAssignments={myFutureAssignments.map((a) => ({
        id: a.id,
        programTitle: a.slot.program.title,
        departmentId: a.slot.departmentId,
        departmentName: a.slot.department.name,
        functionId: a.slot.functionId,
        functionName: a.slot.function?.name || a.slot.title,
        startsAt: a.slot.startsAt.toISOString(),
        endsAt: a.slot.endsAt.toISOString(),
      }))}
      potentialTargets={potentialTargets}
    />
  );
}
