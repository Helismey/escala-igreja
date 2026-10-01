'use client';

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Verifica se já está em modo PWA (standalone)
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone === true);

    setIsStandalone(isInStandaloneMode);

    // Detecta iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Captura evento de instalação do Chrome/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  // Se tiver prompt do Chrome/Android
  if (deferredPrompt) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-surface p-3 sm:p-4 mb-4 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📲</span>
          <div>
            <p className="font-semibold text-ink">Instalar aplicativo</p>
            <p className="text-xs text-ink-muted">Acesse suas escalas mais rápido direto da sua tela inicial.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDismissed(true)}
            className="px-2 py-1 text-xs text-ink-muted hover:text-ink"
          >
            Depois
          </button>
          <button
            onClick={async () => {
              await deferredPrompt.prompt();
              const choice = await deferredPrompt.userChoice;
              if (choice.outcome === 'accepted') {
                setDeferredPrompt(null);
              }
            }}
            className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-control min-h-touch flex items-center"
          >
            Instalar
          </button>
        </div>
      </div>
    );
  }

  // Dica para iOS Safari
  if (isIos) {
    return (
      <div className="bg-info-soft/40 border border-info/30 rounded-surface p-3 mb-4 flex items-start justify-between gap-3 text-xs text-ink">
        <div className="flex items-start gap-2">
          <span className="text-base mt-0.5">📲</span>
          <div>
            <p className="font-semibold">Instale no iPhone</p>
            <p className="text-ink-muted mt-0.5">
              Toque no botão de <strong>Compartilhar</strong> (ícone do quadrado com seta) e escolha <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-ink-muted hover:text-ink p-1 font-bold"
          aria-label="Fechar dica"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
