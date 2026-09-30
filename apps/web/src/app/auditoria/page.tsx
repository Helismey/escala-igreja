import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { can } from '@escala-igreja/domain';

export default async function AuditoriaPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const allowed = can(userContext, 'audit:view');

  if (!allowed) {
    redirect('/');
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Trilha de Auditoria</h1>
        <p className="text-sm text-ink-muted mt-1">
          Registro imutável (somente-inserção) de ações críticas realizadas no sistema.
        </p>
      </div>

      <div className="bg-surface rounded-surface border border-line divide-y divide-line overflow-hidden shadow-sm">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-ink-muted text-sm">
            Nenhum evento de auditoria registrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-ink-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Data e Hora</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Alvo</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((log) => {
                  const date = new Date(log.createdAt);
                  return (
                    <tr key={log.id} className="hover:bg-bg/50">
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted whitespace-nowrap">
                        {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">{log.action}</td>
                      <td className="px-4 py-3 text-ink-muted">
                        {log.targetType ? `${log.targetType} (${log.targetId || '-'})` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            log.result === 'SUCCESS'
                              ? 'bg-success-soft text-success-ink'
                              : 'bg-danger-soft text-danger-ink'
                          }`}
                        >
                          {log.result}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{log.ip || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
