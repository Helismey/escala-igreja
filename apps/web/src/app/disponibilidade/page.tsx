import React from 'react';
import { prisma } from '@escala-igreja/db';
import { getSession } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { DisponibilidadeClient } from './DisponibilidadeClient';

export default async function DisponibilidadePage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      availabilities: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  const preferredWeekdays = user.availabilities
    .filter((a) => a.kind === 'PREFERRED_WEEKDAY' && typeof a.weekday === 'number')
    .map((a) => a.weekday as number)
    .sort((a, b) => a - b);

  const unavailablePeriods = user.availabilities
    .filter((a) => a.kind === 'UNAVAILABLE_PERIOD' && a.from && a.to)
    .map((a) => ({
      id: a.id,
      from: a.from!.toISOString(),
      to: a.to!.toISOString(),
    }))
    .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">
          Minha Disponibilidade
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Informe seus dias preferidos e registre períodos de ausência para auxiliar na montagem das escalas.
        </p>
      </div>

      <DisponibilidadeClient
        initialPreferredWeekdays={preferredWeekdays}
        initialUnavailablePeriods={unavailablePeriods}
      />
    </div>
  );
}
