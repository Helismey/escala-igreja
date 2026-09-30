import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { ConfiguracoesClient } from './ConfiguracoesClient';
import { can } from '@escala-igreja/domain';

export default async function ConfiguracoesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const allowed = can(userContext, 'church:settings:update');

  if (!allowed) {
    redirect('/');
  }

  let settings = await prisma.churchSettings.findFirst();
  if (!settings) {
    settings = await prisma.churchSettings.create({
      data: {
        name: 'Escala Igreja',
        primaryColor: '#0F4C5C',
        secondaryColor: '#F2B632',
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Configurações da Igreja</h1>
        <p className="text-sm text-ink-muted mt-1">
          Defina o nome da igreja e a identidade visual que será aplicada no sistema.
        </p>
      </div>

      <ConfiguracoesClient
        initialSettings={{
          name: settings.name,
          logoUrl: settings.logoUrl,
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
        }}
      />
    </div>
  );
}
