'use client';

import React, { useState } from 'react';
import { AlertBanner } from '@/components/AlertBanner';

export interface DepartmentDetail {
  id: string;
  name: string;
  functions: { id: string; name: string }[];
  membersCount: number;
}

interface DepartamentosClientProps {
  departments: DepartmentDetail[];
  isAdmin: boolean;
}

export function DepartamentosClient({ departments, isAdmin }: DepartamentosClientProps) {
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [activeDeptIdForFunction, setActiveDeptIdForFunction] = useState<string | null>(null);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [message, setMessage] = useState<{ type: 'sucesso' | 'erro'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/departamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao criar departamento.' });
        return;
      }

      setMessage({ type: 'sucesso', text: 'Departamento criado com sucesso!' });
      setShowDeptModal(false);
      setNewDeptName('');
      window.location.reload();
    } catch {
      setMessage({ type: 'erro', text: 'Erro de conexão.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFunction = async (departmentId: string) => {
    if (!newFunctionName.trim()) return;
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/departamentos/funcoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId,
          name: newFunctionName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao criar função.' });
        return;
      }

      setMessage({ type: 'sucesso', text: 'Função criada com sucesso!' });
      setActiveDeptIdForFunction(null);
      setNewFunctionName('');
      window.location.reload();
    } catch {
      setMessage({ type: 'erro', text: 'Erro de conexão.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && <AlertBanner type={message.type} message={message.text} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Departamentos e Ministérios</h1>
          <p className="text-sm text-ink-muted mt-1">
            Organize os departamentos da igreja e as funções especializadas de cada equipe.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowDeptModal(true)}
            className="px-4 py-2.5 bg-primary text-white font-semibold rounded-control hover:opacity-95 text-sm min-h-touch"
          >
            + Novo Departamento
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((dept) => (
          <div key={dept.id} className="bg-surface rounded-surface border border-line p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">{dept.name}</h3>
                <span className="text-xs text-ink-muted">{dept.membersCount} voluntários vinculados</span>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveDeptIdForFunction(
                      activeDeptIdForFunction === dept.id ? null : dept.id
                    );
                    setNewFunctionName('');
                  }}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  + Adicionar Função
                </button>
              )}
            </div>

            {/* Formulário inline para nova função */}
            {activeDeptIdForFunction === dept.id && (
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="text"
                  placeholder="Nome da função (ex: Teclado)"
                  value={newFunctionName}
                  onChange={(e) => setNewFunctionName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-bg border border-field-border rounded-control text-xs text-ink"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCreateFunction(dept.id)}
                  className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-control hover:opacity-95 disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            )}

            {/* Funções do Departamento */}
            <div className="pt-2 border-t border-line">
              <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-2">
                Funções Internas
              </span>
              {dept.functions.length === 0 ? (
                <p className="text-xs text-ink-muted italic">Nenhuma função cadastrada.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {dept.functions.map((f) => (
                    <span key={f.id} className="text-xs bg-bg px-2.5 py-1 rounded-control text-ink font-medium">
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo Departamento */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
          <div className="bg-surface rounded-surface border border-line max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h2 className="font-display font-bold text-lg text-ink">Novo Departamento</h2>

            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                  Nome do Departamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Comunicação e Mídia"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-field-border rounded-control text-sm text-ink"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-3.5 py-1.5 border border-line text-xs font-semibold text-ink-muted rounded-control"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-control hover:opacity-95"
                >
                  {loading ? 'Criando...' : 'Criar Departamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
