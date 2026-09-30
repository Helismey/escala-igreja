import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { ProgramasClient, ProgramListItem, DepartmentOption } from './ProgramasClient';
import { can } from '@escala-igreja/domain';

export default async function ProgramasPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const canManage = can(userContext, 'program:create');

  // Busca programas ordenados por data
  const programs = await prisma.program.findMany({
    include: {
      departments: {
        include: { department: true },
      },
      slots: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Busca departamentos com suas funções
  const departments = await prisma.department.findMany({
    include: {
      functions: true,
    },
  });

  const serializedPrograms: ProgramListItem[] = programs.map((p) => ({
    id: p.id,
    title: p.title,
    date: p.date.toISOString(),
    departments: p.departments.map((d) => ({
      id: d.department.id,
      name: d.department.name,
    })),
    slotsCount: p.slots.length,
  }));

  const departmentOptions: DepartmentOption[] = departments.map((d) => ({
    id: d.id,
    name: d.name,
    functions: d.functions.map((f) => ({ id: f.id, name: f.name })),
  }));

  return (
    <ProgramasClient
      programs={serializedPrograms}
      departments={departmentOptions}
      canManage={canManage}
    />
  );
}
