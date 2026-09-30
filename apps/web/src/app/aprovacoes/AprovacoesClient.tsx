'use client';

import React, { useState } from 'react';
import { AlertBanner } from '@/components/AlertBanner';

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  phonePrimary?: string | null;
  whatsapp?: string | null;
  birthDate?: string | null;
  createdAt: string;
}

export interface DepartmentWithFunctions {
  id: string;
  name: string;
  functions: { id: string; name: string }[];
}

interface AprovacoesClientProps {
  pendingUsers: PendingUser[];
  departments: DepartmentWithFunctions[];
}

export function AprovacoesClient({ pendingUsers, departments }: AprovacoesClientProps) {
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [targetDeptId, setTargetDeptId] = useState<string>(departments[0]?.id || '');
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'sucesso' | 'erro'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const activeDept = departments.find((d) => d.id === targetDeptId);

  const handleFunctionToggle = (funcId: string) => {
    setSelectedFunctionIds((prev) =>
      prev.includes(funcId) ? prev.filter((id) => id !== funcId) : [...prev, funcId]
    );
  };

  const handleApprove = async () => {
    if (!selectedUser || !targetDeptId) return;
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/aprovacoes/aprovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          departmentId: targetDeptId,
          functionIds: selectedFunctionIds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao aprovar cadastro.' });
        return;
      }

      setMessage({ type: 'sucesso', text: `Cadastro de ${selectedUser.name} aprovado com sucesso!` });
      setSelectedUser(null);
      window.location.reload();
    } catch {
      setMessage({ type: 'erro', text: 'Erro de comunicação ao aprovar cadastro.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (userId: string, name: string) => {
    if (!confirm(`Deseja realmente rejeitar o cadastro de ${name}?`)) return;
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/aprovacoes/rejeitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao rejeitar cadastro.' });
        return;
      }

      setMessage({ type: 'sucesso', text: `Cadastro de ${name} rejeitado.` });
      window.location.reload();
    } catch {
      setMessage({ type: 'erro', text: 'Erro ao rejeitar cadastro.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && <AlertBanner type={message.type} message={message.text} />}

      {pendingUsers.length === 0 ? (
        <div className="bg-surface rounded-surface border border-line p-8 text-center">
          <p className="text-ink-muted text-sm">Não há nenhum cadastro pendente de aprovação no momento.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-surface border border-line divide-y divide-line overflow-hidden shadow-sm">
          {pendingUsers.map((user) => (
            <div key={user.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-semibold text-ink text-base block">{user.name}</span>
                <span className="text-xs text-ink-muted block mt-0.5">
                  {user.email} • {user.phonePrimary || 'Sem telefone'} • Cadastrado em{' '}
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(user);
                    setSelectedFunctionIds([]);
                  }}
                  className="px-4 py-2 bg-success text-white font-semibold rounded-control text-xs sm:text-sm hover:opacity-95 min-h-touch"
                >
                  Aprovar cadastro
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(user.id, user.name)}
                  className="px-3.5 py-2 border border-line text-ink-muted hover:text-danger hover:border-danger font-semibold rounded-control text-xs sm:text-sm min-h-touch transition-colors"
                >
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Aprovação com Vínculo a Departamento */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
          <div className="bg-surface rounded-surface border border-line max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="font-display font-bold text-xl text-ink">
              Aprovar {selectedUser.name}
            </h2>
            <p className="text-xs text-ink-muted">
              Selecione o departamento inicial e as funções que o novo voluntário poderá desempenhar:
            </p>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                Departamento *
              </label>
              <select
                value={targetDeptId}
                onChange={(e) => {
                  setTargetDeptId(e.target.value);
                  setSelectedFunctionIds([]);
                }}
                className="w-full px-3 py-2 bg-surface border border-field-border rounded-control text-sm text-ink"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {activeDept && activeDept.functions.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                  Funções Iniciais (opcional)
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeDept.functions.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleFunctionToggle(f.id)}
                      className={`px-3 py-1.5 rounded-control text-xs font-semibold border ${
                        selectedFunctionIds.includes(f.id)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-ink border-line'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 border border-line text-ink-muted text-sm font-semibold rounded-control"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleApprove}
                className="px-4 py-2 bg-success text-white text-sm font-semibold rounded-control hover:opacity-95"
              >
                {loading ? 'Aprovando...' : 'Confirmar Aprovação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
