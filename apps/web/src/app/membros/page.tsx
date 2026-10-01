import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { MembrosClient, MemberListItem, DepartmentOption } from './MembrosClient';

export default async function MembrosPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const isAdmin = userContext?.globalRole === 'ADMIN_MASTER';
  const managedDeptIds =
    userContext?.departmentMemberships
      .filter((m) => m.role === 'MANAGER')
      .map((m) => m.departmentId) || [];

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      include: {
        memberships: {
          include: {
            department: true,
            functions: {
              include: { function: true },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.department.findMany({
      include: {
        functions: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  const memberListItems: MemberListItem[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phonePrimary: u.phonePrimary,
    whatsapp: u.whatsapp,
    photoUrl: u.photoUrl,
    status: u.status as MemberListItem['status'],
    isMinor: u.isMinor,
    guardianName: u.guardianName,
    guardianPhone: u.guardianPhone,
    memberships: u.memberships.map((m) => ({
      id: m.id,
      departmentId: m.departmentId,
      departmentName: m.department.name,
      functions: m.functions.map((f) => ({
        id: f.function.id,
        name: f.function.name,
      })),
    })),
  }));

  const departmentOptions: DepartmentOption[] = departments.map((d) => ({
    id: d.id,
    name: d.name,
    functions: d.functions.map((f) => ({
      id: f.id,
      name: f.name,
    })),
  }));

  return (
    <MembrosClient
      initialMembers={memberListItems}
      departments={departmentOptions}
      isAdmin={isAdmin}
      managedDepartmentIds={managedDeptIds}
    />
  );
}
