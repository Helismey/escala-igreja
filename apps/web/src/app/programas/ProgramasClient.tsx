'use client';

import React, { useState } from 'react';
import { AlertBanner } from '@/components/AlertBanner';

export interface DepartmentOption {
  id: string;
  name: string;
  functions: { id: string; name: string }[];
}

export interface ProgramSlotData {
  title: string;
  departmentId: string;
  functionId?: string;
  startsAtTime: string; // HH:mm
  endsAtTime: string;   // HH:mm
  requiredCount: number;
}

export interface ProgramListItem {
  id: string;
  title: string;
  date: string;
  departments: { id: string; name: string }[];
  slotsCount: number;
}

interface ProgramasClientProps {
  programs: ProgramListItem[];
  departments: DepartmentOption[];
  canManage: boolean;
}

export function ProgramasClient({ programs, departments, canManage }: ProgramasClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cloningProgramId, setCloningProgramId] = useState<string | null>(null);
  const [cloneDate, setCloneDate] = useState('');
  const [message, setMessage] = useState<{ type: 'sucesso' | 'erro'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado do formulário de novo programa
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [slots, setSlots] = useState<ProgramSlotData[]>([
    {
      title: 'Louvor e Ministração',
      departmentId: departments[0]?.id || '',
      functionId: '',
      startsAtTime: '09:00',
      endsAtTime: '10:30',
      requiredCount: 1,
    },
  ]);

  const handleDeptToggle = (deptId: string) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleAddSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        title: '',
        departmentId: selectedDeptIds[0] || departments[0]?.id || '',
        functionId: '',
        startsAtTime: '09:00',
        endsAtTime: '10:30',
        requiredCount: 1,
      },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: keyof ProgramSlotData, val: any) => {
    setSlots((prev) => {
      const copy = [...prev];
      const target = { ...copy[index]!, [field]: val };
      copy[index] = target;
      return copy;
    });
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDeptIds.length === 0) {
      setMessage({ type: 'erro', text: 'Selecione pelo menos um departamento para o programa.' });
      return;
    }

    setMessage(null);
    setLoading(true);

    try {
      const payload = {
        title,
        date: new Date(date).toISOString(),
        departmentIds: selectedDeptIds,
        slots: slots.map((s) => ({
          title: s.title,
          departmentId: s.departmentId,
          functionId: s.functionId || undefined,
          startsAt: new Date(`${date}T${s.startsAtTime}:00`).toISOString(),
          endsAt: new Date(`${date}T${s.endsAtTime}:00`).toISOString(),
          requiredCount: Number(s.requiredCount) || 1,
        })),
      };

      const res = await fetch('/api/programas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao criar programa.' });
        return;
      }

      setMessage({ type: 'sucesso', text: 'Programa e cronograma criados com sucesso!' });
      setShowCreateModal(false);
      window.location.reload();
    } catch {
      setMessage({ type: 'erro', text: 'Erro de conexão ao salvar programa.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloneProgram = async (programId: string) => {
    if (!cloneDate) {
      setMessage({ type: 'erro', text: 'Informe a data de destino para a clonagem.' });
      return;
    }

    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/programas/clonar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId, targetDate: cloneDate }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao clonar programa.' });
        return;
      }

      setMessage({ type: 'sucesso', text: 'Programa clonado com sucesso para a nova data!' });
      setCloningProgramId(null);
      setCloneDate('');
      window.location.reload();
    } catch {
      setMessage({ type: 'erro', text: 'Erro ao clonar programa.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && <AlertBanner type={message.type} message={message.text} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Programas e Cultos</h1>
          <p className="text-sm text-ink-muted mt-1">
            Cadastre os cultos, defina o cronograma e clone para outras datas com um clique.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-primary text-white font-semibold rounded-control hover:opacity-95 text-sm min-h-touch"
          >
            + Criar Novo Programa
          </button>
        )}
      </div>

      {/* Lista de Programas */}
      {programs.length === 0 ? (
        <div className="bg-surface rounded-surface border border-line p-8 text-center">
          <p className="text-ink-muted text-sm">Nenhum programa ainda. Crie o primeiro para montar a escala.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-surface border border-line divide-y divide-line overflow-hidden shadow-sm">
          {programs.map((prog) => {
            const progDate = new Date(prog.date);
            const isCloningThis = cloningProgramId === prog.id;

            return (
              <div key={prog.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-ink">{prog.title}</h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {progDate.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    • {prog.slotsCount} partes/vagas
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {prog.departments.map((d) => (
                      <span key={d.id} className="text-[11px] bg-bg px-2 py-0.5 rounded-control text-ink-muted">
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center space-x-2">
                    {isCloningThis ? (
                      <div className="flex items-center space-x-2 p-2 bg-bg rounded-control border border-line">
                        <input
                          type="date"
                          value={cloneDate}
                          onChange={(e) => setCloneDate(e.target.value)}
                          className="px-2.5 py-1.5 bg-surface border border-field-border rounded-control text-xs text-ink"
                        />
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleCloneProgram(prog.id)}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-control"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setCloningProgramId(null)}
                          className="text-xs text-ink-muted hover:text-ink font-semibold"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCloningProgramId(prog.id);
                          setCloneDate('');
                        }}
                        className="px-3.5 py-2 border border-line text-ink hover:border-primary font-semibold rounded-control text-xs sm:text-sm min-h-touch"
                      >
                        Clonar programa
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação de Programa */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
          <div className="bg-surface rounded-surface border border-line max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="font-display font-bold text-xl text-ink mb-4">Criar Programa</h2>

            <form onSubmit={handleCreateProgram} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                  Título do Programa *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Culto de Celebração Dominical"
                  className="w-full px-3 py-2 bg-surface border border-field-border rounded-control text-sm text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-field-border rounded-control text-sm text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">
                  Departamentos Envolvidos *
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => handleDeptToggle(dept.id)}
                      className={`px-3 py-1.5 rounded-control text-xs font-semibold border ${
                        selectedDeptIds.includes(dept.id)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-ink border-line'
                      }`}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slots / Cronograma */}
              <div className="pt-2 border-t border-line">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink-muted uppercase">
                    Cronograma e Funções
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    + Adicionar parte
                  </button>
                </div>

                <div className="space-y-3">
                  {slots.map((slot, index) => {
                    const dept = departments.find((d) => d.id === slot.departmentId);

                    return (
                      <div key={index} className="p-3 bg-bg rounded-control border border-line space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Título da parte / slot"
                            value={slot.title}
                            onChange={(e) => handleSlotChange(index, 'title', e.target.value)}
                            className="px-2.5 py-1.5 bg-surface border border-field-border rounded-control text-xs text-ink"
                          />
                          <select
                            value={slot.departmentId}
                            onChange={(e) => handleSlotChange(index, 'departmentId', e.target.value)}
                            className="px-2.5 py-1.5 bg-surface border border-field-border rounded-control text-xs text-ink"
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="text-[10px] text-ink-muted block">Início</span>
                            <input
                              type="time"
                              required
                              value={slot.startsAtTime}
                              onChange={(e) => handleSlotChange(index, 'startsAtTime', e.target.value)}
                              className="w-full px-2 py-1 bg-surface border border-field-border rounded-control text-xs text-ink"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-ink-muted block">Término</span>
                            <input
                              type="time"
                              required
                              value={slot.endsAtTime}
                              onChange={(e) => handleSlotChange(index, 'endsAtTime', e.target.value)}
                              className="w-full px-2 py-1 bg-surface border border-field-border rounded-control text-xs text-ink"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-ink-muted block">Função</span>
                            <select
                              value={slot.functionId || ''}
                              onChange={(e) => handleSlotChange(index, 'functionId', e.target.value)}
                              className="w-full px-2 py-1 bg-surface border border-field-border rounded-control text-xs text-ink"
                            >
                              <option value="">Qualquer</option>
                              {dept?.functions.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <span className="text-[10px] text-ink-muted block">Vagas</span>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={slot.requiredCount}
                                onChange={(e) => handleSlotChange(index, 'requiredCount', e.target.value)}
                                className="w-14 px-2 py-1 bg-surface border border-field-border rounded-control text-xs text-ink"
                              />
                            </div>
                            {slots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(index)}
                                className="text-xs text-danger hover:underline font-semibold pb-1"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-line text-ink-muted hover:text-ink text-sm font-semibold rounded-control"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-control hover:opacity-95"
                >
                  {loading ? 'Salvando...' : 'Salvar Programa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
