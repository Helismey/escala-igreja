'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertBanner } from '@/components/AlertBanner';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.requiresMfa) {
          setRequiresMfa(true);
        }
        setError(data.error || 'Não foi possível entrar. Verifique os dados.');
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-surface p-8 rounded-surface border border-line shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary text-white font-display font-bold text-2xl rounded-control flex items-center justify-center mx-auto mb-4">
            E
          </div>
          <h1 className="font-display font-bold text-2xl text-ink">Entrar no Escala Igreja</h1>
          <p className="text-sm text-ink-muted mt-1">Acesse suas escalas e compromissos</p>
        </div>

        {error && (
          <div className="mb-6">
            <AlertBanner type="erro" message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface border border-field-border rounded-control text-ink text-base focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
              placeholder="seu.email@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface border border-field-border rounded-control text-ink text-base focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
              placeholder="••••••••••••"
            />
          </div>

          {requiresMfa && (
            <div className="p-4 bg-info-soft rounded-control border border-primary/20">
              <label className="block text-sm font-semibold text-ink mb-1" htmlFor="totp">
                Código de verificação em duas etapas (TOTP)
              </label>
              <input
                id="totp"
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 bg-surface border border-primary rounded-control text-center text-xl font-mono tracking-widest text-ink focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                placeholder="123456"
                autoFocus
              />
              <span className="text-xs text-ink-muted block mt-1">
                Abra seu aplicativo autenticador e digite o código de 6 dígitos.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary text-on-primary font-semibold rounded-control hover:opacity-95 transition-opacity disabled:opacity-50 min-h-touch flex items-center justify-center text-base"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-line text-center">
          <p className="text-sm text-ink-muted">
            Ainda não tem cadastro?{' '}
            <Link href="/cadastro" className="font-semibold text-primary hover:underline">
              Cadastre-se como voluntário
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
