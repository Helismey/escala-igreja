import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { maskPhoneNumber, maskEmail } from '@escala-igreja/domain';

export default async function MembrosPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const isAdmin = userContext?.globalRole === 'ADMIN_MASTER';
  const managedDeptIds = userContext?.departmentMemberships
    .filter((m) => m.role === 'MANAGER')
    .map((m) => m.departmentId) || [];

  const members = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
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
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Equipe e Voluntários</h1>
          <p className="text-sm text-ink-muted mt-1">
            Lista de voluntários ativos e suas respectivas funções nos departamentos.
          </p>
        </div>
      </div>

      <div className="bg-surface rounded-surface border border-line divide-y divide-line overflow-hidden shadow-sm">
        {members.map((member) => {
          // Permissão para visualizar dados de contato: ADMIN ou GESTOR de um dos departamentos do membro
          const canViewContacts =
            isAdmin ||
            member.memberships.some((m) => managedDeptIds.includes(m.departmentId));

          return (
            <div key={member.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-ink text-base">{member.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {member.memberships.map((m) => (
                      <span
                        key={m.id}
                        className="text-xs bg-bg px-2 py-0.5 rounded-control text-ink-muted font-medium"
                      >
                        {m.department.name}
                        {m.functions.length > 0 && ` (${m.functions.map((f) => f.function.name).join(', ')})`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Informações de contato (Proteção LGPD) */}
              <div className="text-xs text-ink-muted sm:text-right space-y-0.5">
                {canViewContacts ? (
                  <>
                    <p className="font-medium text-ink">{member.phonePrimary || 'Sem telefone'}</p>
                    <p>{member.email}</p>
                  </>
                ) : (
                  <>
                    <p className="italic text-ink-muted">Contatos protegidos (visível apenas para gestores)</p>
                    <p>{maskEmail(member.email)} • {maskPhoneNumber(member.phonePrimary)}</p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
