import React from 'react';
import { prisma } from '@revezo/db';
import { getSession, getCurrentUserContext, getActiveChurchContext } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { ConfiguracoesClient } from './ConfiguracoesClient';
import { can } from '@revezo/domain';

export default async function ConfiguracoesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userContext = await getCurrentUserContext();
  const churchContext = await getActiveChurchContext();
  const activeChurch = churchContext?.activeChurch;

  const allowed = can(userContext, 'church:settings:update', {
    churchId: activeChurch?.id,
  });

  if (!allowed) {
    redirect('/');
  }

  let settings = await prisma.churchSettings.findFirst();
  if (!settings) {
    settings = await prisma.churchSettings.create({
      data: {
        name: activeChurch?.name || 'Revezo',
        primaryColor: activeChurch?.primaryColor || '#0F4C5C',
        secondaryColor: activeChurch?.secondaryColor || '#F2B632',
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Configurações da Igreja</h1>
          {activeChurch && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {activeChurch.name}
            </span>
          )}
        </div>
        <p className="text-sm text-ink-muted mt-1">
          Defina o nome da igreja e a identidade visual que será aplicada no sistema da congregação.
        </p>
      </div>

      <ConfiguracoesClient
        initialSettings={{
          name: activeChurch?.name || settings.name,
          logoUrl: settings.logoUrl,
          primaryColor: activeChurch?.primaryColor || settings.primaryColor,
          secondaryColor: activeChurch?.secondaryColor || settings.secondaryColor,
        }}
      />
    </div>
  );
}
