import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { EscalasClient, SerializedProgram, AvailableVolunteer } from './EscalasClient';

export default async function EscalasPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const isAdmin = userContext?.globalRole === 'ADMIN_MASTER';
  const isManager = userContext?.departmentMemberships.some((m) => m.role === 'MANAGER');

  // Busca todos os programas futuros com seus slots e escalas
  const programs = await prisma.program.findMany({
    include: {
      slots: {
        include: {
          department: true,
          function: true,
          assignments: {
            where: {
              status: { notIn: ['DECLINED', 'SUBSTITUTED'] },
            },
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: {
          startsAt: 'asc',
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Busca voluntários ativos com suas disponibilidades
  const activeUsers = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    include: {
      memberships: {
        include: {
          functions: true,
        },
      },
      availabilities: true,
    },
  });

  const serializedPrograms: SerializedProgram[] = programs.map((p) => ({
    id: p.id,
    title: p.title,
    date: p.date.toISOString(),
    slots: p.slots.map((s) => ({
      id: s.id,
      title: s.title,
      departmentId: s.departmentId,
      departmentName: s.department.name,
      functionId: s.functionId,
      functionName: s.function?.name,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      requiredCount: s.requiredCount,
      assignments: s.assignments.map((a) => ({
        id: a.id,
        userId: a.userId,
        userName: a.user.name,
        status: a.status,
      })),
    })),
  }));

  const serializedVolunteers: AvailableVolunteer[] = activeUsers.map((u) => ({
    id: u.id,
    name: u.name,
    departmentIds: u.memberships.map((m) => m.departmentId),
    functionIds: u.memberships.flatMap((m) => m.functions.map((f) => f.functionId)),
    availabilities: u.availabilities.map((av) => ({
      kind: av.kind,
      weekday: av.weekday,
      from: av.from?.toISOString() || null,
      to: av.to?.toISOString() || null,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Montagem de Escalas</h1>
          <p className="text-sm text-ink-muted mt-1">
            Atribua os voluntários respeitando o limite de 2 por dia e sem conflitos de horário.
          </p>
        </div>
      </div>

      {serializedPrograms.length === 0 ? (
        <div className="bg-surface rounded-surface border border-line p-8 text-center">
          <p className="text-ink-muted text-sm">
            Nenhum programa ainda. Crie o primeiro para montar a escala.
          </p>
        </div>
      ) : (
        <EscalasClient
          programs={serializedPrograms}
          volunteers={serializedVolunteers}
          isManagerOrAdmin={Boolean(isAdmin || isManager)}
        />
      )}
    </div>
  );
}
