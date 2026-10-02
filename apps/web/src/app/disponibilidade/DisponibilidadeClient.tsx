'use client';

import React, { useState } from 'react';
import { AlertBanner } from '@/components/AlertBanner';
import { formatWeekdayPtBr } from '@revezo/domain';

export interface UnavailablePeriodItem {
  id: string;
  from: string;
  to: string;
}

interface DisponibilidadeClientProps {
  initialPreferredWeekdays: number[];
  initialUnavailablePeriods: UnavailablePeriodItem[];
}

const ALL_WEEKDAYS = [
  { day: 0, label: 'Domingo', short: 'Dom' },
  { day: 1, label: 'Segunda-feira', short: 'Seg' },
  { day: 2, label: 'Terça-feira', short: 'Ter' },
  { day: 3, label: 'Quarta-feira', short: 'Qua' },
  { day: 4, label: 'Quinta-feira', short: 'Qui' },
  { day: 5, label: 'Sexta-feira', short: 'Sex' },
  { day: 6, label: 'Sábado', short: 'Sáb' },
];

export function DisponibilidadeClient({
  initialPreferredWeekdays,
  initialUnavailablePeriods,
}: DisponibilidadeClientProps) {
  const [preferredWeekdays, setPreferredWeekdays] = useState<number[]>(initialPreferredWeekdays);
  const [unavailablePeriods, setUnavailablePeriods] = useState<UnavailablePeriodItem[]>(
    initialUnavailablePeriods
  );

  const [savingWeekdays, setSavingWeekdays] = useState(false);
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [removingPeriodId, setRemovingPeriodId] = useState<string | null>(null);

  const [newFromDate, setNewFromDate] = useState('');
  const [newToDate, setNewToDate] = useState('');

  const [message, setMessage] = useState<{ type: 'sucesso' | 'erro'; text: string } | null>(null);

  const toggleWeekday = (day: number) => {
    setMessage(null);
    if (preferredWeekdays.includes(day)) {
      setPreferredWeekdays(preferredWeekdays.filter((d) => d !== day));
    } else {
      setPreferredWeekdays([...preferredWeekdays, day].sort((a, b) => a - b));
    }
  };

  const handleSaveWeekdays = async () => {
    setMessage(null);
    setSavingWeekdays(true);

    try {
      const res = await fetch('/api/disponibilidade/preferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekdays: preferredWeekdays }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({
          type: 'erro',
          text: data.error || 'Não foi possível salvar suas preferências.',
        });
        return;
      }

      setMessage({
        type: 'sucesso',
        text: 'Dias preferidos atualizados com sucesso!',
      });
    } catch {
      setMessage({
        type: 'erro',
        text: 'Erro de conexão ao salvar preferências.',
      });
    } finally {
      setSavingWeekdays(false);
    }
  };

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFromDate || !newToDate) {
      setMessage({
        type: 'erro',
        text: 'Selecione a data de início e a data de término.',
      });
      return;
    }

    if (new Date(`${newFromDate}T00:00:00Z`).getTime() > new Date(`${newToDate}T23:59:59Z`).getTime()) {
      setMessage({
        type: 'erro',
        text: 'A data de término deve ser posterior ou igual à data de início.',
      });
      return;
    }

    setMessage(null);
    setAddingPeriod(true);

    try {
      const res = await fetch('/api/disponibilidade/indisponibilidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: new Date(`${newFromDate}T00:00:00Z`).toISOString(),
          to: new Date(`${newToDate}T23:59:59Z`).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({
          type: 'erro',
          text: data.error || 'Não foi possível adicionar o período de indisponibilidade.',
        });
        return;
      }

      setUnavailablePeriods((prev) =>
        [...prev, data.period].sort(
          (a, b) => new Date(a.from).getTime() - new Date(b.from).getTime()
        )
      );
      setNewFromDate('');
      setNewToDate('');
      setMessage({
        type: 'sucesso',
        text: 'Período de indisponibilidade registrado com sucesso!',
      });
    } catch {
      setMessage({
        type: 'erro',
        text: 'Erro de conexão ao cadastrar período.',
      });
    } finally {
      setAddingPeriod(false);
    }
  };

  const handleRemovePeriod = async (id: string) => {
    if (!confirm('Deseja realmente remover este período de ausência?')) {
      return;
    }

    setMessage(null);
    setRemovingPeriodId(id);

    try {
      const res = await fetch('/api/disponibilidade/indisponibilidade', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilityId: id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({
          type: 'erro',
          text: data.error || 'Não foi possível remover o período.',
        });
        return;
      }

      setUnavailablePeriods((prev) => prev.filter((p) => p.id !== id));
      setMessage({
        type: 'sucesso',
        text: 'Período removido com sucesso.',
      });
    } catch {
      setMessage({
        type: 'erro',
        text: 'Erro de conexão ao remover período.',
      });
    } finally {
      setRemovingPeriodId(null);
    }
  };

  return (
    <div className="space-y-6">
      {message && <AlertBanner type={message.type} message={message.text} />}

      {/* Seção 1: Dias da Semana Preferidos */}
      <div className="bg-surface rounded-surface border border-line p-5 sm:p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">
            Dias preferidos para servir
          </h2>
          <p className="text-sm text-ink-muted mt-1 leading-relaxed">
            Selecione os dias da semana em que você tem disponibilidade para servir. Se você não marcar nenhum dia, o sistema entenderá que você pode servir em qualquer dia da semana.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
          {ALL_WEEKDAYS.map((wd) => {
            const isSelected = preferredWeekdays.includes(wd.day);
            return (
              <button
                key={wd.day}
                type="button"
                onClick={() => toggleWeekday(wd.day)}
                className={`flex flex-col items-center justify-center p-3 rounded-control border text-sm font-semibold transition-all min-h-touch cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                    : 'bg-bg text-ink border-field-border hover:border-primary/50'
                }`}
                aria-pressed={isSelected}
              >
                <span className="text-xs uppercase tracking-wider opacity-80">{wd.short}</span>
                <span className="mt-1 text-sm">{wd.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-line">
          <p className="text-xs text-ink-muted">
            {preferredWeekdays.length === 0 ? (
              <span className="font-medium text-ink">
                Disponibilidade aberta: você pode ser escalado em qualquer dia.
              </span>
            ) : (
              <span>
                Preferência por:{' '}
                <strong className="text-ink font-semibold">
                  {preferredWeekdays.map((d) => formatWeekdayPtBr(d)).join(', ')}
                </strong>
              </span>
            )}
          </p>

          <button
            type="button"
            onClick={handleSaveWeekdays}
            disabled={savingWeekdays}
            className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-control hover:opacity-95 disabled:opacity-50 transition-all min-h-touch self-start sm:self-auto cursor-pointer"
          >
            {savingWeekdays ? 'Salvando...' : 'Salvar dias preferidos'}
          </button>
        </div>
      </div>

      {/* Seção 2: Períodos de Indisponibilidade */}
      <div className="bg-surface rounded-surface border border-line p-5 sm:p-6 space-y-5 shadow-sm">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">
            Períodos de ausência e indisponibilidade
          </h2>
          <p className="text-sm text-ink-muted mt-1 leading-relaxed">
            Vai viajar, tirar férias ou terá um compromisso inadiável? Cadastre o período aqui para que os gestores não escalem você nessas datas.
          </p>
        </div>

        {/* Formulário para adicionar novo período */}
        <form
          onSubmit={handleAddPeriod}
          className="bg-bg p-4 rounded-control border border-line space-y-4"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Registrar nova ausência
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="period-from"
                className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1"
              >
                Data de início
              </label>
              <input
                id="period-from"
                type="date"
                value={newFromDate}
                onChange={(e) => setNewFromDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-field-border rounded-control text-ink text-sm min-h-touch focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="period-to"
                className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1"
              >
                Data de término
              </label>
              <input
                id="period-to"
                type="date"
                value={newToDate}
                onChange={(e) => setNewToDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-field-border rounded-control text-ink text-sm min-h-touch focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={addingPeriod || !newFromDate || !newToDate}
              className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-control hover:opacity-95 disabled:opacity-50 transition-all min-h-touch cursor-pointer"
            >
              {addingPeriod ? 'Adicionando...' : 'Adicionar período'}
            </button>
          </div>
        </form>

        {/* Lista de períodos cadastrados */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Períodos cadastrados ({unavailablePeriods.length})
          </h3>

          {unavailablePeriods.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-line rounded-control">
              <p className="text-sm text-ink-muted">
                Nenhum período de ausência cadastrado. Quando precisar se ausentar em dias de escala, registre as datas acima.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line border border-line rounded-control overflow-hidden bg-surface">
              {unavailablePeriods.map((period) => {
                const fromFormatted = new Date(period.from).toLocaleDateString('pt-BR', {
                  timeZone: 'UTC',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
                const toFormatted = new Date(period.to).toLocaleDateString('pt-BR', {
                  timeZone: 'UTC',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });

                const isRemoving = removingPeriodId === period.id;

                return (
                  <div
                    key={period.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-bg/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-danger shrink-0" />
                      <div>
                        <span className="font-semibold text-sm text-ink block">
                          {fromFormatted} até {toFormatted}
                        </span>
                        <span className="text-xs text-ink-muted">
                          Indisponível para ser escalado neste intervalo
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePeriod(period.id)}
                      disabled={isRemoving}
                      className="px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft rounded-control transition-colors min-h-touch disabled:opacity-50 cursor-pointer"
                    >
                      {isRemoving ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
