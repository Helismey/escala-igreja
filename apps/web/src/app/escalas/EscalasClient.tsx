'use client';

import React, { useState } from 'react';
import { AlertBanner } from '@/components/AlertBanner';
import { isDateInUnavailablePeriods, matchesPreferredWeekdays } from '@escala-igreja/domain';

export interface SerializedSlot {
  id: string;
  title: string;
  departmentId: string;
  departmentName: string;
  functionId?: string | null;
  functionName?: string | null;
  startsAt: string;
  endsAt: string;
  requiredCount: number;
  assignments: {
    id: string;
    userId: string;
    userName: string;
    status: string;
  }[];
}

export interface SerializedProgram {
  id: string;
  title: string;
  date: string;
  slots: SerializedSlot[];
}

export interface AvailableVolunteer {
  id: string;
  name: string;
  departmentIds: string[];
  functionIds: string[];
  availabilities?: {
    kind: 'PREFERRED_WEEKDAY' | 'UNAVAILABLE_PERIOD';
    weekday?: number | null;
    from?: string | null;
    to?: string | null;
  }[];
  isOverloaded?: boolean;
  consecutiveWeekendsCount?: number;
  assignmentsIn30Days?: number;
}

interface EscalasClientProps {
  programs: SerializedProgram[];
  volunteers: AvailableVolunteer[];
  isManagerOrAdmin: boolean;
}

export function EscalasClient({ programs, volunteers, isManagerOrAdmin }: EscalasClientProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    programs[0]?.id || ''
  );
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'sucesso' | 'erro'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedAssignmentId, setCopiedAssignmentId] = useState<string | null>(null);

  const handleCopyConfirmationLink = async (assignmentId: string) => {
    try {
      const res = await fetch('/api/escalas/token-confirmacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao gerar link de confirmação' });
        return;
      }
      await navigator.clipboard.writeText(data.whatsappMessage || data.confirmationUrl);
      setCopiedAssignmentId(assignmentId);
      setMessage({
        type: 'sucesso',
        text: 'Mensagem com link de confirmação copiada! Cole no WhatsApp do voluntário.',
      });
      setTimeout(() => setCopiedAssignmentId(null), 4000);
    } catch {
      setMessage({ type: 'erro', text: 'Não foi possível copiar o link de confirmação.' });
    }
  };

  const currentProgram = programs.find((p) => p.id === selectedProgramId);

  const handleAssign = async (slotId: string) => {
    if (!selectedVolunteerId) return;
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/escalas/atribuir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          userId: selectedVolunteerId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({
          type: 'erro',
          text: data.error || 'Não foi possível atribuir a escala.',
        });
        return;
      }

      setMessage({
        type: 'sucesso',
        text: 'Voluntário escalado com sucesso!',
      });
      setActiveSlotId(null);
      setSelectedVolunteerId('');
      // Recarrega a página para atualizar as atribuições
      window.location.reload();
    } catch {
      setMessage({
        type: 'erro',
        text: 'Erro de comunicação ao salvar escala.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!confirm('Deseja realmente remover este voluntário da escala?')) return;
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/escalas/remover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({
          type: 'erro',
          text: data.error || 'Erro ao remover voluntário da escala.',
        });
        return;
      }

      setMessage({
        type: 'sucesso',
        text: 'Escala removida com sucesso.',
      });
      window.location.reload();
    } catch {
      setMessage({
        type: 'erro',
        text: 'Erro de comunicação ao remover escala.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seleção do Programa */}
      <div className="bg-surface p-4 sm:p-5 rounded-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label htmlFor="program-select" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
            Selecione o Programa / Culto
          </label>
          <select
            id="program-select"
            value={selectedProgramId}
            onChange={(e) => {
              setSelectedProgramId(e.target.value);
              setMessage(null);
              setActiveSlotId(null);
            }}
            className="px-3.5 py-2.5 bg-surface border border-field-border rounded-control text-ink font-semibold focus:ring-2 focus:ring-primary min-h-touch text-base"
          >
            {programs.map((prog) => (
              <option key={prog.id} value={prog.id}>
                {prog.title} —{' '}
                {new Date(prog.date).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <AlertBanner type={message.type} message={message.text} />
      )}

      {/* Grade de Slots do Programa Selecionado */}
      {currentProgram && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-ink">
              Grade de Escalas: {currentProgram.title}
            </h2>
            <span className="text-xs text-ink-muted">
              {currentProgram.slots.length} partes/funções no cronograma
            </span>
          </div>

          <div className="bg-surface rounded-surface border border-line divide-y divide-line overflow-hidden shadow-sm">
            {currentProgram.slots.map((slot) => {
              const startsAt = new Date(slot.startsAt);
              const endsAt = new Date(slot.endsAt);
              const isSlotOpen = slot.assignments.length < slot.requiredCount;

              // Voluntários compatíveis com o departamento do slot
              const candidateVolunteers = volunteers.filter((v) =>
                v.departmentIds.includes(slot.departmentId)
              );

              return (
                <div key={slot.id} className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-display font-bold text-base text-ink">
                          {slot.title}
                        </span>
                        {slot.functionName && (
                          <span className="text-xs bg-bg px-2 py-0.5 rounded-control text-ink-muted font-medium">
                            {slot.functionName}
                          </span>
                        )}
                        {isSlotOpen ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-control bg-warning-soft text-warning-ink">
                            Vaga aberta ({slot.assignments.length}/{slot.requiredCount})
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-control bg-success-soft text-success-ink">
                            Completa ({slot.assignments.length}/{slot.requiredCount})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-ink-muted">
                        {slot.departmentName} •{' '}
                        {startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{' '}
                        às {endsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {isManagerOrAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlotId(activeSlotId === slot.id ? null : slot.id);
                          setSelectedVolunteerId('');
                          setMessage(null);
                        }}
                        className="px-3.5 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-semibold rounded-control transition-colors min-h-touch self-start sm:self-auto"
                      >
                        {activeSlotId === slot.id ? 'Fechar' : '+ Escalar voluntário'}
                      </button>
                    )}
                  </div>

                  {/* Formulário inline para escalar voluntário */}
                  {activeSlotId === slot.id && (
                    <div className="p-3 bg-bg rounded-control border border-line space-y-3 mt-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                          value={selectedVolunteerId}
                          onChange={(e) => setSelectedVolunteerId(e.target.value)}
                          className="flex-1 px-3 py-2 bg-surface border border-field-border rounded-control text-sm text-ink min-h-touch"
                        >
                          <option value="">Selecione um voluntário...</option>
                          {candidateVolunteers.map((vol) => {
                            const unavailablePeriods =
                              vol.availabilities
                                ?.filter((a) => a.kind === 'UNAVAILABLE_PERIOD' && a.from && a.to)
                                .map((a) => ({ from: a.from!, to: a.to! })) || [];

                            const isUnavailable = isDateInUnavailablePeriods(
                              slot.startsAt,
                              slot.endsAt,
                              unavailablePeriods
                            );

                            const preferredDays =
                              vol.availabilities
                                ?.filter((a) => a.kind === 'PREFERRED_WEEKDAY' && typeof a.weekday === 'number')
                                .map((a) => a.weekday as number) || [];

                            const isOutsidePreferences = !matchesPreferredWeekdays(
                              slot.startsAt,
                              preferredDays
                            );

                            let tag = '';
                            if (isUnavailable) {
                              tag = ' 🚫 (Indisponível no período)';
                            } else if (vol.isOverloaded) {
                              tag = ` ⚠️ (${vol.consecutiveWeekendsCount ? `${vol.consecutiveWeekendsCount} fds seguidos` : 'Sobrecarga recente'})`;
                            } else if (isOutsidePreferences) {
                              tag = ' ⚠️ (Fora dos dias preferidos)';
                            }

                            return (
                              <option key={vol.id} value={vol.id} disabled={isUnavailable}>
                                {vol.name}
                                {tag}
                              </option>
                            );
                          })}
                        </select>

                        <button
                          type="button"
                          disabled={!selectedVolunteerId || loading}
                          onClick={() => handleAssign(slot.id)}
                          className="px-4 py-2 bg-primary text-white font-semibold text-xs rounded-control hover:opacity-95 disabled:opacity-50 min-h-touch"
                        >
                          {loading ? 'Salvando...' : 'Confirmar escala'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de voluntários escalados neste slot */}
                  <div className="pt-1">
                    {slot.assignments.length === 0 ? (
                      <p className="text-xs text-ink-muted italic">Nenhum voluntário escalado ainda.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {slot.assignments.map((asg) => (
                          <div
                            key={asg.id}
                            className="flex items-center justify-between py-1.5 px-3 bg-bg rounded-control text-sm"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-primary" />
                              <span className="font-semibold text-ink">{asg.userName}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  asg.status === 'CONFIRMED'
                                    ? 'bg-success-soft text-success-ink'
                                    : 'bg-info-soft text-primary'
                                }`}
                              >
                                {asg.status === 'CONFIRMED' ? 'Confirmado' : 'Pendente'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleCopyConfirmationLink(asg.id)}
                                className="text-xs text-primary hover:underline font-semibold flex items-center space-x-1 px-2 py-1 rounded hover:bg-primary/5 transition-colors"
                                title="Copiar mensagem com link de confirmação para o WhatsApp"
                              >
                                <span>{copiedAssignmentId === asg.id ? '✓ Copiado!' : '📋 Link WhatsApp'}</span>
                              </button>

                              {isManagerOrAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleRemove(asg.id)}
                                  className="text-xs text-ink-muted hover:text-danger font-semibold p-1"
                                  title="Remover da escala"
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
