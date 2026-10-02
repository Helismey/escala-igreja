import React from 'react';
import { getSession, getCurrentUserContext, getActiveChurchContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { prisma } from '@revezo/db';
import TrocasClient from './TrocasClient';

export default async function TrocasPage() {
  const session = await getSession();
  const userContext = await getCurrentUserContext();
  const { activeChurch } = await getActiveChurchContext();

  if (!session || !userContext) {
    redirect('/login');
  }

  const userId = session.userId;
  const isAdmin = userContext.globalRole === 'ADMIN_MASTER';
  const isPastor = userContext.globalRole === 'PASTOR';
  const isElder = userContext.globalRole === 'ELDER';
  const managedDeptIds = userContext.departmentMemberships
    .filter((m) => m.role === 'MANAGER')
    .map((m) => m.departmentId);

  const canApprove = Boolean(isAdmin || isPastor || isElder || managedDeptIds.length > 0);

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

  // 2. Voluntários ativos da mesma congregação e departamentos (para seleção de substituto)
  const potentialTargets = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      id: { not: userId },
      ...(activeChurch ? { churchId: activeChurch.id } : {}),
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
      isManager={canApprove}
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
