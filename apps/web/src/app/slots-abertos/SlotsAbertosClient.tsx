'use client';

import React, { useState } from 'react';
import { OpenSlotSuggestion } from '@escala-igreja/db';
import { AlertBanner } from '@/components/AlertBanner';
import { formatScheduleDateTimePtBr } from '@escala-igreja/domain';

interface SlotsAbertosClientProps {
  initialSlots: OpenSlotSuggestion[];
}

export function SlotsAbertosClient({ initialSlots }: SlotsAbertosClientProps) {
  const [slots, setSlots] = useState<OpenSlotSuggestion[]>(initialSlots);
  const [selectedDept, setSelectedDept] = useState<string>('todos');
  const [loadingSlotId, setLoadingSlotId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'sucesso' | 'erro'; text: string } | null>(null);

  // Departamentos únicos para o filtro
  const departments = Array.from(
    new Map(initialSlots.map((s) => [s.departmentId, s.departmentName])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredSlots = selectedDept === 'todos'
    ? slots
    : slots.filter((s) => s.departmentId === selectedDept);

  const handleQuickAssign = async (slotId: string, userId: string, volunteerName: string) => {
    setMessage(null);
    setLoadingSlotId(slotId);

    try {
      const res = await fetch('/api/escalas/atribuir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, userId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({
          type: 'erro',
          text: data.error || 'Não foi possível escalar o voluntário.',
        });
        return;
      }

      setMessage({
        type: 'sucesso',
        text: `${volunteerName} foi escalado(a) com sucesso!`,
      });

      // Remove ou atualiza a vaga na lista
      setSlots((prev) =>
        prev
          .map((s) => {
            if (s.slotId === slotId) {
              const newCount = s.currentAssignmentsCount + 1;
              return {
                ...s,
                currentAssignmentsCount: newCount,
                suggestedCandidates: s.suggestedCandidates.filter((c) => c.userId !== userId),
              };
            }
            return s;
          })
          .filter((s) => s.currentAssignmentsCount < s.requiredCount || s.declinedAssignments.length > 0)
      );
    } catch {
      setMessage({
        type: 'erro',
        text: 'Erro de comunicação ao atribuir escala.',
      });
    } finally {
      setLoadingSlotId(null);
    }
  };

  return (
    <div className="space-y-6">
      {message && <AlertBanner type={message.type} message={message.text} />}

      {/* Barra de Filtro */}
      {departments.length > 1 && (
        <div className="bg-surface p-4 rounded-surface border border-line flex items-center justify-between gap-4">
          <label htmlFor="dept-filter" className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Filtrar por departamento:
          </label>
          <select
            id="dept-filter"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-surface border border-field-border rounded-control text-sm text-ink font-semibold min-h-touch"
          >
            <option value="todos">Todos os departamentos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {filteredSlots.length === 0 ? (
        <div className="bg-surface rounded-surface border border-line p-8 text-center space-y-2 shadow-sm">
          <span className="text-3xl">🎉</span>
          <h3 className="font-display font-bold text-lg text-ink">Nenhuma vaga aberta no momento!</h3>
          <p className="text-sm text-ink-muted">
            Todas as partes dos próximos programas estão preenchidas e com equipes completas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSlots.map((slot) => {
            const { dateStr, timeStr } = formatScheduleDateTimePtBr(slot.startsAt, slot.endsAt);
            const isUrgent = new Date(slot.startsAt).getTime() - Date.now() < 48 * 60 * 60 * 1000;

            return (
              <div
                key={slot.slotId}
                className={`bg-surface rounded-surface border p-5 space-y-4 shadow-sm transition-all ${
                  isUrgent ? 'border-warning/60 bg-warning-soft/20' : 'border-line'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-display font-bold text-lg text-ink">
                        {slot.programTitle} — {slot.slotTitle}
                      </span>
                      {slot.functionName && (
                        <span className="text-xs bg-bg px-2 py-0.5 rounded-control text-ink-muted font-medium">
                          {slot.functionName}
                        </span>
                      )}
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-control bg-warning-soft text-warning-ink">
                        Vaga aberta ({slot.currentAssignmentsCount}/{slot.requiredCount})
                      </span>
                      {isUrgent && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-control bg-danger-soft text-danger-ink animate-pulse">
                          Urgente: menos de 48h
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-1">
                      {slot.departmentName} • {dateStr} ({timeStr})
                    </p>
                  </div>
                </div>

                {/* Voluntários que desmarcaram */}
                {slot.declinedAssignments.length > 0 && (
                  <div className="p-3 bg-danger-soft border border-danger/30 rounded-control space-y-1">
                    <p className="text-xs font-bold text-danger-ink">Desmarcação registrada:</p>
                    {slot.declinedAssignments.map((d) => (
                      <p key={d.id} className="text-xs text-danger-ink">
                        • <strong>{d.userName}</strong> desmarcou
                        {d.declinedReason ? `: "${d.declinedReason}"` : '.'}
                      </p>
                    ))}
                  </div>
                )}

                {/* Sugestões inteligentes de candidatos recomendados */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
                    Sugestões do motor de escala (disponíveis, sem conflito e dentro do limite):
                  </span>

                  {slot.suggestedCandidates.length === 0 ? (
                    <p className="text-xs text-ink-muted italic">
                      Nenhum voluntário livre com a função necessária encontrado para este horário.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {slot.suggestedCandidates.map((candidate) => (
                        <div
                          key={candidate.userId}
                          className="p-3 bg-bg border border-line rounded-control flex flex-col justify-between gap-2"
                        >
                          <div>
                            <span className="font-semibold text-sm text-ink block">{candidate.userName}</span>
                            <span className="text-[11px] text-ink-muted block mt-0.5">
                              {candidate.assignmentsLast60Days === 0
                                ? 'Sem escalas nos últimos 60 dias'
                                : `${candidate.assignmentsLast60Days} escala(s) nos últimos 60 dias`}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={loadingSlotId === slot.slotId}
                            onClick={() => handleQuickAssign(slot.slotId, candidate.userId, candidate.userName)}
                            className="w-full px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-control hover:opacity-95 disabled:opacity-50 min-h-touch inline-flex items-center justify-center transition-colors"
                          >
                            {loadingSlotId === slot.slotId ? 'Escalando...' : 'Escalar agora'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
