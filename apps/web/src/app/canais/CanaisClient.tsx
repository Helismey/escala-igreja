'use client';

import React, { useState } from 'react';
import { AlertBanner } from '@/components/AlertBanner';

interface NotificationLogItem {
  id: string;
  kind: string;
  channel: string;
  success: boolean;
  error?: string | null;
  sentAt: string;
  recipientName: string;
  recipientContact: string;
  slotDescription: string;
}

interface CanaisClientProps {
  initialFlags: Record<string, boolean>;
  recentLogs: NotificationLogItem[];
  activeUsers: { id: string; name: string; email: string; phonePrimary?: string | null }[];
}

export function CanaisClient({ initialFlags, recentLogs, activeUsers }: CanaisClientProps) {
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);
  const [savingFlag, setSavingFlag] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'sucesso' | 'erro'; text: string } | null>(null);

  // Formulário de Teste de Notificação
  const [testChannel, setTestChannel] = useState<'WHATSAPP' | 'EMAIL' | 'PUSH' | 'SMS'>('EMAIL');
  const [testUserId, setTestUserId] = useState<string>(activeUsers[0]?.id || '');
  const [sendingTest, setSendingTest] = useState(false);

  // Disparo manual do cron de lembretes
  const [runningCron, setRunningCron] = useState(false);

  const handleToggleFlag = async (key: string, currentVal: boolean) => {
    setSavingFlag(key);
    setMessage(null);
    const newVal = !currentVal;

    try {
      const res = await fetch('/api/canais/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: newVal }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao atualizar feature flag.' });
        return;
      }

      setFlags((prev) => ({ ...prev, [key]: newVal }));
      setMessage({ type: 'sucesso', text: `Recurso "${key}" ${newVal ? 'ativado' : 'desativado'} com sucesso.` });
    } catch {
      setMessage({ type: 'erro', text: 'Erro de comunicação ao salvar configuração.' });
    } finally {
      setSavingFlag(null);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUserId) return;
    setMessage(null);
    setSendingTest(true);

    try {
      const res = await fetch('/api/canais/testar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: testChannel, targetUserId: testUserId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Falha ao disparar teste de notificação.' });
        return;
      }

      setMessage({
        type: 'sucesso',
        text: `Teste disparado com sucesso pelo canal ${testChannel}! Confira os detalhes no histórico abaixo.`,
      });
    } catch {
      setMessage({ type: 'erro', text: 'Erro de comunicação ao disparar teste.' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleRunRemindersCronNow = async () => {
    if (!confirm('Deseja executar a verificação e o envio de lembretes agora?')) return;
    setMessage(null);
    setRunningCron(true);

    try {
      const res = await fetch('/api/cron/reminders', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao executar rotina de lembretes.' });
        return;
      }

      setMessage({
        type: 'sucesso',
        text: `Rotina concluída: ${data.processed} escalas verificadas (${data.successCount} enviadas, ${data.failureCount} falhas).`,
      });
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      setMessage({ type: 'erro', text: 'Erro ao acionar rotina de lembretes.' });
    } finally {
      setRunningCron(false);
    }
  };

  return (
    <div className="space-y-8">
      {message && <AlertBanner type={message.type} message={message.text} />}

      {/* Cartões de Status dos Canais e Feature Flags */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-xl text-ink">Status dos Canais e Controle de Recursos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* E-mail */}
          <div className="bg-surface rounded-surface border border-line p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">✉️</span>
                <h3 className="font-semibold text-ink text-base">E-mail (Resend / SMTP)</h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-control bg-success-soft text-success-ink">
                Canal Ativo
              </span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Canal primário estável e gratuito. Utilizado como fallback padrão para voluntários com endereço de e-mail.
            </p>
          </div>

          {/* Web Push */}
          <div className="bg-surface rounded-surface border border-line p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🔔</span>
                <h3 className="font-semibold text-ink text-base">Web Push (Navegador e PWA)</h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-control bg-success-soft text-success-ink">
                Canal Ativo
              </span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Notificações diretas na tela do celular para voluntários que autorizarem alertas no navegador ou no PWA.
            </p>
          </div>

          {/* WhatsApp */}
          <div className="bg-surface rounded-surface border border-line p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">💬</span>
                <h3 className="font-semibold text-ink text-base">WhatsApp (Adaptador Plugável)</h3>
              </div>
              <button
                type="button"
                disabled={savingFlag === 'whatsapp_enabled'}
                onClick={() => handleToggleFlag('whatsapp_enabled', flags['whatsapp_enabled'] ?? true)}
                className={`px-3 py-1.5 rounded-control text-xs font-bold transition-colors min-h-touch ${
                  (flags['whatsapp_enabled'] ?? true)
                    ? 'bg-success text-white hover:opacity-95'
                    : 'bg-bg text-ink-muted border border-line'
                }`}
              >
                {(flags['whatsapp_enabled'] ?? true) ? 'Habilitado' : 'Desabilitado'}
              </button>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Dispara mensagens formatadas com link direto de confirmação. Desative a flag a qualquer momento sem necessidade de novo deploy.
            </p>
          </div>

          {/* SMS */}
          <div className="bg-surface rounded-surface border border-line p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📱</span>
                <h3 className="font-semibold text-ink text-base">SMS</h3>
              </div>
              <button
                type="button"
                disabled={savingFlag === 'sms_enabled'}
                onClick={() => handleToggleFlag('sms_enabled', flags['sms_enabled'] ?? false)}
                className={`px-3 py-1.5 rounded-control text-xs font-bold transition-colors min-h-touch ${
                  flags['sms_enabled']
                    ? 'bg-success text-white hover:opacity-95'
                    : 'bg-bg text-ink-muted border border-line'
                }`}
              >
                {flags['sms_enabled'] ? 'Habilitado' : 'Desabilitado'}
              </button>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Desativado por padrão conforme diretriz de custo zero do projeto (Regra 01). Ative apenas se contratar provedor de SMS dedicado.
            </p>
          </div>
        </div>
      </section>

      {/* Disparo Manual de Lembretes & Teste de Canais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acionador de Cron */}
        <div className="bg-surface rounded-surface border border-line p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-ink text-base">Rotina Automática de Lembretes (D-7, D-2 e D-1)</h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            A rotina diária verifica todas as escalas que acontecem nos próximos dias e dispara os lembretes pendentes respeitando a idempotência.
          </p>

          <button
            type="button"
            disabled={runningCron}
            onClick={handleRunRemindersCronNow}
            className="px-4 py-2.5 bg-primary text-white font-semibold rounded-control text-sm hover:opacity-95 disabled:opacity-50 min-h-touch inline-flex items-center justify-center transition-colors"
          >
            {runningCron ? 'Processando lembretes...' : '⚡ Executar rotina de lembretes agora'}
          </button>
        </div>

        {/* Formulário de Teste de Disparo */}
        <div className="bg-surface rounded-surface border border-line p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-ink text-base">Disparar Teste de Notificação</h3>
          <form onSubmit={handleSendTest} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                  Canal
                </label>
                <select
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface border border-field-border rounded-control text-sm text-ink min-h-touch"
                >
                  <option value="EMAIL">E-mail</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="PUSH">Web Push</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                  Destinatário de Teste
                </label>
                <select
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-field-border rounded-control text-sm text-ink min-h-touch"
                >
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingTest}
              className="px-4 py-2 bg-bg border border-line text-ink font-semibold rounded-control text-sm hover:bg-surface disabled:opacity-50 min-h-touch inline-flex items-center justify-center transition-colors"
            >
              {sendingTest ? 'Enviando teste...' : 'Enviar mensagem de teste'}
            </button>
          </form>
        </div>
      </div>

      {/* Histórico Recente de Entregas (NotificationLog) */}
      <section className="space-y-3">
        <h3 className="font-semibold text-ink text-base">Últimas Notificações Registradas</h3>
        <div className="bg-surface rounded-surface border border-line divide-y divide-line overflow-hidden shadow-sm">
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-ink-muted text-sm">
              Nenhuma notificação registrada recentemente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg text-ink-muted text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Data e Hora</th>
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Destinatário</th>
                    <th className="px-4 py-3">Escala / Alvo</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentLogs.map((log) => {
                    const date = new Date(log.sentAt);
                    return (
                      <tr key={log.id} className="hover:bg-bg/50">
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted whitespace-nowrap">
                          {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-xs text-ink">{log.channel}</td>
                        <td className="px-4 py-3 text-xs text-ink font-mono">{log.kind}</td>
                        <td className="px-4 py-3 text-xs text-ink">
                          <span className="block font-semibold">{log.recipientName}</span>
                          <span className="text-[11px] text-ink-muted">{log.recipientContact}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted">{log.slotDescription}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              log.success
                                ? 'bg-success-soft text-success-ink'
                                : 'bg-danger-soft text-danger-ink'
                            }`}
                          >
                            {log.success ? 'Entregue' : 'Falha'}
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
      </section>
    </div>
  );
}
