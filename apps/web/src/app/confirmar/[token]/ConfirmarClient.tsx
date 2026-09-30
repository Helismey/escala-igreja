'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface ConfirmationData {
  token: string;
  assignmentId: string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'SUBSTITUTED';
  declinedReason: string | null;
  memberFirstName: string;
  memberFullName: string;
  programTitle: string;
  departmentName: string;
  functionName: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
}

interface ChurchInfo {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
}

interface Props {
  initialData?: ConfirmationData | null;
  error?: string | null;
  church: ChurchInfo;
}

export default function ConfirmarClient({ initialData, error: initialError, church }: Props) {
  const [data, setData] = useState<ConfirmationData | null>(initialData || null);
  const [error, setError] = useState<string | null>(initialError || null);
  const [loading, setLoading] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Imprevisto pessoal ou de saúde');
  const [customReason, setCustomReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'declined';
    message: string;
  } | null>(
    data?.status === 'CONFIRMED'
      ? {
          type: 'success',
          message: 'Sua presença já está confirmada! Agradecemos por sua dedicação.',
        }
      : data?.status === 'DECLINED'
      ? {
          type: 'declined',
          message: 'Você avisou que não poderá comparecer. A equipe já foi informada.',
        }
      : null
  );

  const startsAt = data ? new Date(data.startsAt) : null;
  const endsAt = data ? new Date(data.endsAt) : null;

  async function handleConfirm() {
    if (!data) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/confirmar/${data.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CONFIRM' }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Não foi possível confirmar sua presença.');
      }

      setData((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : null));
      setActionFeedback({
        type: 'success',
        message: 'Presença confirmada com sucesso! Que Deus abençoe seu ministério.',
      });
      setShowDeclineForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao confirmar presença.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setLoading(true);
    setError(null);

    const finalReason = customReason.trim()
      ? `${selectedReason}: ${customReason.trim()}`
      : selectedReason;

    try {
      const res = await fetch(`/api/confirmar/${data.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DECLINE',
          reason: finalReason,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Não foi possível registrar seu aviso.');
      }

      setData((prev) =>
        prev ? { ...prev, status: 'DECLINED', declinedReason: finalReason } : null
      );
      setActionFeedback({
        type: 'declined',
        message: 'Agradecemos por nos avisar com antecedência! O gestor da sua equipe foi notificado.',
      });
      setShowDeclineForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar aviso.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Cabeçalho com Logo e Nome da Igreja */}
        <div className="text-center space-y-2">
          {church.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={church.logoUrl}
              alt={church.name}
              className="h-14 w-auto mx-auto object-contain drop-shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-primary text-white font-display font-black text-xl flex items-center justify-center mx-auto shadow-md">
              {church.name.charAt(0)}
            </div>
          )}
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest">
            {church.name}
          </h2>
        </div>

        {/* Card Principal */}
        <div className="bg-surface rounded-2xl border border-line shadow-card p-6 sm:p-7 space-y-6">
          {error && !data ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-danger-soft text-danger-ink flex items-center justify-center mx-auto text-xl font-bold">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-lg text-ink">Link indisponível</h3>
                <p className="text-sm text-ink-muted">{error}</p>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Links de confirmação são de uso único e expiram após um período ou quando a escala
                já foi encerrada.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-white rounded-control text-sm font-semibold hover:opacity-95 min-h-touch"
                >
                  Entrar no sistema
                </Link>
              </div>
            </div>
          ) : data && startsAt && endsAt ? (
            <>
              {/* Saudação calorosa */}
              <div className="space-y-1 border-b border-line pb-4">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Escala de Voluntariado
                </span>
                <h1 className="font-display font-bold text-2xl text-ink">
                  Olá, {data.memberFirstName}!
                </h1>
                <p className="text-sm text-ink-muted">
                  Você foi escalado(a) para servir na nossa igreja.
                </p>
              </div>

              {/* Detalhes da Escala */}
              <div className="bg-bg rounded-control p-4 border border-line space-y-3">
                <div>
                  <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold block">
                    Culto / Evento
                  </span>
                  <span className="font-display font-bold text-lg text-ink">
                    {data.programTitle}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-line/60">
                  <div>
                    <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold block">
                      Ministério
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {data.departmentName}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold block">
                      Função
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {data.functionName}
                    </span>
                  </div>
                </div>

                <div className="pt-1 border-t border-line/60">
                  <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold block">
                    Data e Horário
                  </span>
                  <p className="text-sm font-bold text-ink">
                    {startsAt.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{' '}
                    às{' '}
                    {endsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Feedback pós-ação */}
              {actionFeedback && (
                <div
                  className={`p-4 rounded-control border text-sm font-medium ${
                    actionFeedback.type === 'success'
                      ? 'bg-success-soft text-success-ink border-success/30'
                      : 'bg-warning-soft text-warning-ink border-warning/30'
                  }`}
                >
                  <p className="flex items-center space-x-2">
                    <span className="text-lg">
                      {actionFeedback.type === 'success' ? '🎉' : '🙏'}
                    </span>
                    <span>{actionFeedback.message}</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-danger-soft text-danger-ink border border-danger/30 rounded-control text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Botões de Ação para Escala Pendente ou Mudança de Status */}
              {!showDeclineForm && (
                <div className="space-y-3 pt-2">
                  {data.status !== 'CONFIRMED' && (
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={loading}
                      className="w-full py-3.5 px-4 bg-success text-white font-bold rounded-control hover:opacity-95 active:scale-[0.99] transition-all min-h-touch text-base shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <span>Salvando...</span>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Confirmar presença</span>
                        </>
                      )}
                    </button>
                  )}

                  {data.status !== 'DECLINED' && (
                    <button
                      type="button"
                      onClick={() => setShowDeclineForm(true)}
                      disabled={loading}
                      className="w-full py-3 px-4 border border-line text-ink-muted hover:text-danger hover:border-danger font-semibold rounded-control text-sm transition-colors min-h-touch"
                    >
                      {data.status === 'CONFIRMED'
                        ? 'Surgiu um imprevisto? Desmarcar'
                        : 'Não poderei ir (Avisar imprevisto)'}
                    </button>
                  )}
                </div>
              )}

              {/* Formulário amigável de justificativa / desmarcação */}
              {showDeclineForm && (
                <form onSubmit={handleDecline} className="space-y-4 pt-2 border-t border-line">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-ink text-sm">
                      Sentiremos sua falta! Pode nos contar o motivo?
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Isso ajuda o gestor a reorganizar a equipe e encontrar um substituto.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {[
                      'Imprevisto pessoal ou de saúde',
                      'Viagem ou compromisso familiar',
                      'Trabalho ou estudos',
                      'Outro motivo',
                    ].map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center space-x-3 p-3 rounded-control border text-sm cursor-pointer transition-colors ${
                          selectedReason === reason
                            ? 'border-primary bg-primary/5 text-ink font-semibold'
                            : 'border-line text-ink-muted hover:bg-bg'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={reason}
                          checked={selectedReason === reason}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="text-primary focus:ring-primary"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>

                  {selectedReason === 'Outro motivo' && (
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Detalhes adicionais (opcional)"
                      maxLength={150}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-line rounded-control focus:outline-none focus:border-primary text-ink bg-surface resize-none"
                    />
                  )}

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 px-4 bg-danger text-white font-bold rounded-control hover:opacity-95 text-sm min-h-touch disabled:opacity-50"
                    >
                      {loading ? 'Enviando...' : 'Confirmar desmarcação'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeclineForm(false)}
                      disabled={loading}
                      className="px-4 py-3 border border-line text-ink-muted hover:text-ink font-semibold rounded-control text-sm min-h-touch"
                    >
                      Voltar
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : null}
        </div>

        {/* Rodapé institucional */}
        <div className="text-center text-xs text-ink-muted space-y-1">
          <p>Sistema Escala Igreja • Seguro e confidencial</p>
          <p>
            Dúvidas? Entre em contato com a liderança da sua congregação.
          </p>
        </div>
      </div>
    </div>
  );
}
