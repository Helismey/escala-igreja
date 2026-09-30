import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { DepartamentosClient, DepartmentDetail } from './DepartamentosClient';

export default async function DepartamentosPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const isAdmin = userContext?.globalRole === 'ADMIN_MASTER';

  const depts = await prisma.department.findMany({
    include: {
      functions: true,
      members: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  const serializedDepts: DepartmentDetail[] = depts.map((d) => ({
    id: d.id,
    name: d.name,
    functions: d.functions.map((f) => ({ id: f.id, name: f.name })),
    membersCount: d.members.length,
  }));

  return (
    <DepartamentosClient
      departments={serializedDepts}
      isAdmin={Boolean(isAdmin)}
    />
  );
}
