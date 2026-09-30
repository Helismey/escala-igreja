'use client';

import React, { useState } from 'react';
import { AlertBanner } from '@/components/AlertBanner';

interface DepartmentOption {
  id: string;
  name: string;
}

interface VolunteerStat {
  userId: string;
  name: string;
  email: string;
  departmentNames: string[];
  totalScheduled: number;
  confirmed: number;
  declined: number;
  substituted: number;
  pending: number;
  lastServedAt: Date | string | null;
}

interface ReportData {
  period: {
    from: string;
    to: string;
  };
  totals: {
    totalAssignments: number;
    confirmedCount: number;
    declinedCount: number;
    substitutedCount: number;
    pendingCount: number;
    confirmationRate: number;
  };
  volunteers: VolunteerStat[];
}

interface HistoricoClientProps {
  isAdmin: boolean;
  departments: DepartmentOption[];
  initialReport: ReportData;
  initialDepartmentId: string;
}

export default function HistoricoClient({
  isAdmin,
  departments,
  initialReport,
  initialDepartmentId,
}: HistoricoClientProps) {
  const [selectedDeptId, setSelectedDeptId] = useState(initialDepartmentId);
  const [periodDays, setPeriodDays] = useState<'30' | '90' | '180' | '365'>('90');
  const [report, setReport] = useState<ReportData>(initialReport);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Calcula datas a partir dos dias selecionados
  function calculatePeriod(days: number) {
    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  async function fetchReport(deptId: string, daysStr: '30' | '90' | '180' | '365') {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = calculatePeriod(parseInt(daysStr, 10));
      const params = new URLSearchParams({
        from,
        to,
        ...(deptId ? { departmentId: deptId } : {}),
      });

      const res = await fetch(`/api/relatorios/participacao?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      } else {
        setError(data.error || 'Erro ao carregar dados do relatório');
      }
    } catch {
      setError('Erro de conexão ao buscar histórico');
    } finally {
      setLoading(false);
    }
  }

  function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId);
    fetchReport(deptId, periodDays);
  }

  function handlePeriodChange(days: '30' | '90' | '180' | '365') {
    setPeriodDays(days);
    fetchReport(selectedDeptId, days);
  }

  function handleExportCsv() {
    const { from, to } = calculatePeriod(parseInt(periodDays, 10));
    const params = new URLSearchParams({
      from,
      to,
      format: 'csv',
      ...(selectedDeptId ? { departmentId: selectedDeptId } : {}),
    });

    window.open(`/api/relatorios/participacao?${params.toString()}`, '_blank');
  }

  // Filtragem de voluntários por busca textual
  const filteredVolunteers = report.volunteers.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">
            Histórico e Participação
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Acompanhe o engajamento da equipe, comparecimento e assiduidade dos voluntários.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 bg-surface border border-line text-ink font-semibold rounded-control text-sm hover:border-primary transition-colors flex items-center gap-2 self-start sm:self-auto min-h-touch shadow-sm"
        >
          <span>📥</span> Exportar Planilha (CSV)
        </button>
      </div>

      {error && <AlertBanner type="erro" message={error} />}

      {/* Barra de Filtros */}
      <div className="bg-surface p-4 rounded-surface border border-line flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Departamento */}
          <div>
            <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
              Departamento
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="bg-bg border border-line rounded-control px-3 py-2 text-sm text-ink font-medium focus:outline-none focus:border-primary"
            >
              {isAdmin && <option value="">Todos os Departamentos</option>}
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Período */}
          <div>
            <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
              Período
            </label>
            <select
              value={periodDays}
              onChange={(e) => handlePeriodChange(e.target.value as any)}
              className="bg-bg border border-line rounded-control px-3 py-2 text-sm text-ink font-medium focus:outline-none focus:border-primary"
            >
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="180">Últimos 6 meses</option>
              <option value="365">Último ano</option>
            </select>
          </div>
        </div>

        {/* Busca por voluntário */}
        <div className="w-full sm:w-64">
          <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
            Buscar Voluntário
          </label>
          <input
            type="text"
            placeholder="Nome ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg border border-line rounded-control px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Cards de Métricas e Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-surface border border-line">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1">
            Total de Escalas
          </span>
          <span className="font-display font-bold text-2xl sm:text-3xl text-ink">
            {report.totals.totalAssignments}
          </span>
          <span className="text-xs text-ink-muted block mt-1">escalas no período</span>
        </div>

        <div className="bg-surface p-5 rounded-surface border border-line">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1">
            Comparecimento
          </span>
          <span className="font-display font-bold text-2xl sm:text-3xl text-success-ink">
            {report.totals.confirmationRate}%
          </span>
          <span className="text-xs text-ink-muted block mt-1">
            {report.totals.confirmedCount} presenças confirmadas
          </span>
        </div>

        <div className="bg-surface p-5 rounded-surface border border-line">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1">
            Desmarcações
          </span>
          <span className="font-display font-bold text-2xl sm:text-3xl text-danger-ink">
            {report.totals.declinedCount}
          </span>
          <span className="text-xs text-ink-muted block mt-1">imprevistos informados</span>
        </div>

        <div className="bg-surface p-5 rounded-surface border border-line">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1">
            Substituições
          </span>
          <span className="font-display font-bold text-2xl sm:text-3xl text-warning-ink">
            {report.totals.substitutedCount}
          </span>
          <span className="text-xs text-ink-muted block mt-1">vagas realocadas</span>
        </div>
      </div>

      {/* Tabela de Participação por Voluntário */}
      <div className="bg-surface rounded-surface border border-line overflow-hidden shadow-sm">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-ink">Engajamento por Voluntário</h2>
          <span className="text-xs text-ink-muted">
            {filteredVolunteers.length} voluntários com atividade
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-ink-muted text-sm">Atualizando dados...</div>
        ) : filteredVolunteers.length === 0 ? (
          <div className="text-center py-12 text-ink-muted text-sm">
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-ink-muted uppercase text-[11px] font-bold tracking-wider border-b border-line">
                <tr>
                  <th className="py-3 px-4">Voluntário</th>
                  <th className="py-3 px-4">Departamentos</th>
                  <th className="py-3 px-4 text-center">Total</th>
                  <th className="py-3 px-4 text-center text-success-ink">Confirmadas</th>
                  <th className="py-3 px-4 text-center text-danger-ink">Recusadas</th>
                  <th className="py-3 px-4 text-center text-warning-ink">Substituídas</th>
                  <th className="py-3 px-4 text-right">Taxa de Presença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredVolunteers.map((vol) => {
                  const rate =
                    vol.totalScheduled > 0
                      ? Math.round((vol.confirmed / vol.totalScheduled) * 100)
                      : 0;

                  return (
                    <tr key={vol.userId} className="hover:bg-bg/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-ink">
                        <div>{vol.name}</div>
                        <div className="text-xs text-ink-muted font-normal">{vol.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-ink-muted">
                        {vol.departmentNames.join(', ')}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-ink">
                        {vol.totalScheduled}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-success-ink">
                        {vol.confirmed}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-danger-ink">
                        {vol.declined}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-warning-ink">
                        {vol.substituted}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-ink">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-control text-xs ${
                            rate >= 80
                              ? 'bg-success-soft text-success-ink'
                              : rate >= 50
                              ? 'bg-warning-soft text-warning-ink'
                              : 'bg-danger-soft text-danger-ink'
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>
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
