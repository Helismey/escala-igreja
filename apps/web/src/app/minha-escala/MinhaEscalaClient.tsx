'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CalendarMonthView, CalendarEventItem } from '@/components/CalendarMonthView';
import { ListBullets, Calendar, Check, ArrowsLeftRight, X } from '@/components/Icons';

export interface VolunteerAssignmentItem {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'SUBSTITUTED';
  declinedReason?: string | null;
  slot: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    department: {
      id: string;
      name: string;
    };
    function?: {
      id: string;
      name: string;
    } | null;
    program: {
      id: string;
      title: string;
    };
  };
}

interface MinhaEscalaClientProps {
  assignments: VolunteerAssignmentItem[];
  confirmAction: (formData: FormData) => Promise<void>;
  declineAction: (formData: FormData) => Promise<void>;
}

export function MinhaEscalaClient({
  assignments,
  confirmAction,
  declineAction,
}: MinhaEscalaClientProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Departamentos distintos em que o voluntário está escalado
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of assignments) {
      map.set(a.slot.department.id, a.slot.department.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  // Eventos mapeados para o componente de calendário
  const calendarEvents = useMemo<CalendarEventItem[]>(() => {
    return assignments.map((asg) => {
      const startsAt = new Date(asg.slot.startsAt);
      const endsAt = new Date(asg.slot.endsAt);
      const timeStr = `${startsAt.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })} - ${endsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      return {
        id: asg.id,
        title: `${asg.slot.department.name} (${asg.slot.function?.name || asg.slot.title})`,
        date: asg.slot.startsAt,
        time: timeStr,
        departmentName: asg.slot.department.name,
        departmentId: asg.slot.department.id,
        status: asg.status,
        subtitle: `Culto: ${asg.slot.program.title} • Função: ${asg.slot.function?.name || asg.slot.title}`,
        meta: asg,
      };
    });
  }, [assignments]);

  return (
    <div className="space-y-4">
      {/* Barra de alternância de visão */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center bg-bg rounded-control p-1 border border-line">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-control text-xs font-semibold transition-all inline-flex items-center gap-1.5 min-h-touch ${
              viewMode === 'list'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <ListBullets size={16} weight={viewMode === 'list' ? 'fill' : 'regular'} />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-control text-xs font-semibold transition-all inline-flex items-center gap-1.5 min-h-touch ${
              viewMode === 'calendar'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Calendar size={16} weight={viewMode === 'calendar' ? 'fill' : 'regular'} />
            Meu Calendário
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarMonthView
          events={calendarEvents}
          departments={departments}
          selectedDepartmentId={selectedDeptId}
          onSelectDepartmentId={setSelectedDeptId}
          canAddEvent={false}
          emptyStateMessage="Você não possui nenhuma escala agendada para este dia."
        />
      ) : assignments.length === 0 ? (
        <div className="bg-surface rounded-surface border border-line p-8 text-center shadow-sm">
          <p className="text-ink-muted text-sm">
            Você não está escalado(a) nos próximos dias. Quando for escalado(a), aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-surface border border-line divide-y divide-line overflow-hidden shadow-sm">
          {assignments.map((asg) => {
            const isPast = new Date(asg.slot.endsAt) < new Date();
            const startsAt = new Date(asg.slot.startsAt);
            const endsAt = new Date(asg.slot.endsAt);

            return (
              <div
                key={asg.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-bg/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-display font-bold text-base sm:text-lg text-ink">
                      {asg.slot.program.title}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-control uppercase tracking-wider ${
                        asg.status === 'CONFIRMED'
                          ? 'bg-success-soft text-success-ink'
                          : asg.status === 'DECLINED'
                          ? 'bg-danger-soft text-danger-ink'
                          : asg.status === 'SUBSTITUTED'
                          ? 'bg-info-soft text-primary'
                          : 'bg-warning-soft text-warning-ink'
                      }`}
                    >
                      {asg.status === 'CONFIRMED'
                        ? 'Confirmado'
                        : asg.status === 'DECLINED'
                        ? 'Desmarcado'
                        : asg.status === 'SUBSTITUTED'
                        ? 'Substituído'
                        : 'Pendente'}
                    </span>
                  </div>

                  <p className="text-sm text-ink font-semibold">
                    {asg.slot.department.name} — {asg.slot.function?.name || asg.slot.title}
                  </p>

                  <p className="text-xs text-ink-muted">
                    {startsAt.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    •{' '}
                    <span className="tabular-nums">
                      {startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às{' '}
                      {endsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>

                  {asg.declinedReason && (
                    <p className="text-xs text-danger font-medium mt-1">
                      Motivo da desmarcação: {asg.declinedReason}
                    </p>
                  )}
                </div>

                {!isPast && asg.status !== 'DECLINED' && asg.status !== 'SUBSTITUTED' && (
                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    {asg.status === 'PENDING' && (
                      <form action={confirmAction}>
                        <input type="hidden" name="assignmentId" value={asg.id} />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-success text-white font-semibold rounded-control text-xs sm:text-sm hover:bg-success/90 min-h-touch transition-all shadow-sm inline-flex items-center gap-1.5"
                        >
                          <Check size={16} weight="bold" /> Confirmar presença
                        </button>
                      </form>
                    )}

                    <Link
                      href="/trocas"
                      className="px-3.5 py-2 border border-line text-ink hover:text-primary hover:border-primary font-semibold rounded-control text-xs sm:text-sm min-h-touch transition-colors inline-flex items-center gap-1.5"
                    >
                      <ArrowsLeftRight size={16} /> Pedir Troca
                    </Link>

                    <form action={declineAction}>
                      <input type="hidden" name="assignmentId" value={asg.id} />
                      <input type="hidden" name="reason" value="Imprevisto informado pelo voluntário" />
                      <button
                        type="submit"
                        className="px-3.5 py-2 border border-line text-ink-muted hover:text-danger hover:border-danger font-semibold rounded-control text-xs sm:text-sm min-h-touch transition-colors inline-flex items-center gap-1.5"
                      >
                        <X size={16} /> Desmarcar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
