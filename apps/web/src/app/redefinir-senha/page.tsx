import React, { Suspense } from 'react';
import { RedefinirSenhaClient } from './RedefinirSenhaClient';

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4">
          <div className="max-w-md w-full bg-surface p-8 rounded-surface border border-line shadow-sm text-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-ink-muted">Carregando...</p>
          </div>
        </div>
      }
    >
      <RedefinirSenhaClient />
    </Suspense>
  );
}
