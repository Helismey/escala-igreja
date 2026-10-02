'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertBanner } from '@/components/AlertBanner';
import { Warning, Lock, Check, CaretLeft } from '@/components/Icons';

export function RedefinirSenhaClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function verifyToken() {
      if (!token || token.trim().length < 32) {
        setTokenError('Link de redefinição inválido ou incompleto.');
        setChecking(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setTokenError(data.error || 'Este link de redefinição não é válido ou já expirou.');
        } else {
          setUserName(data.userName || null);
        }
      } catch {
        setTokenError('Erro ao verificar validade do link. Tente novamente.');
      } finally {
        setChecking(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 12) {
      setError('A nova senha deve ter no mínimo 12 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('A confirmação de senha não confere com a nova senha digitada.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Não foi possível redefinir a senha.');
        return;
      }

      setSuccess('Sua senha foi redefinida com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch {
      setError('Erro de conexão ao redefinir sua senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4">
        <div className="max-w-md w-full bg-surface p-8 rounded-surface border border-line shadow-sm text-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-ink-muted">Validando link de segurança...</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-surface p-8 rounded-surface border border-line shadow-sm text-center space-y-5">
          <div className="w-12 h-12 bg-danger/10 text-danger rounded-control flex items-center justify-center mx-auto border border-danger/20">
            <Warning size={24} className="text-danger" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-ink">Link Inválido ou Expirado</h1>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">
              {tokenError}
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Link
              href="/esqueci-senha"
              className="inline-block w-full py-2.5 px-4 bg-primary text-white font-semibold rounded-control hover:opacity-95 text-sm min-h-touch leading-tight"
            >
              Solicitar novo link de recuperação
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center text-xs font-semibold text-ink-muted hover:underline pt-2"
            >
              <CaretLeft size={14} className="mr-1" /> Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-surface p-8 rounded-surface border border-line shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-control flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Lock size={24} className="text-primary" />
          </div>
          <h1 className="font-display font-bold text-2xl text-ink">Criar Nova Senha</h1>
          <p className="text-sm text-ink-muted mt-1 leading-relaxed">
            {userName ? `Olá, ${userName}! ` : ''}Digite sua nova senha abaixo. Ela deve conter no mínimo 12 caracteres.
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <AlertBanner type="erro" message={error} />
          </div>
        )}

        {success && (
          <div className="mb-6">
            <AlertBanner type="sucesso" message={success} />
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1" htmlFor="password">
                Nova Senha (mínimo 12 caracteres)
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface border border-field-border rounded-control text-ink text-base focus:outline-none focus:ring-2 focus:ring-primary min-h-touch pr-16"
                  placeholder="••••••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted px-2 py-1 hover:text-ink"
                >
                  {showPassword ? 'Ocultar' : 'Exibir'}
                </button>
              </div>
              <div className="mt-1 flex items-center space-x-1.5 text-xs text-ink-muted">
                {password.length >= 12 ? (
                  <span className="text-success font-semibold inline-flex items-center gap-1">
                    <Check size={14} className="text-success" /> Mínimo atingido
                  </span>
                ) : (
                  <span>{password.length}/12 caracteres</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink mb-1" htmlFor="confirmPassword">
                Confirmar Nova Senha
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-field-border rounded-control text-ink text-base focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                placeholder="••••••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-control hover:opacity-95 transition-opacity disabled:opacity-50 text-base shadow-sm min-h-touch flex items-center justify-center"
            >
              {loading ? 'Salvando nova senha...' : 'Salvar nova senha'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center border-t border-line pt-4">
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
