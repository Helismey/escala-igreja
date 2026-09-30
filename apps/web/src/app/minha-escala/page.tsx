import React from 'react';
import { prisma, confirmAssignmentWithAudit, declineAssignmentWithAudit } from '@escala-igreja/db';
import { getSession } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { CalendarSubscriptionButton } from '@/components/CalendarSubscriptionButton';

export default async function MinhaEscalaPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      userId: session.userId,
    },
    include: {
      slot: {
        include: {
          department: true,
          function: true,
          program: true,
        },
      },
    },
    orderBy: {
      slot: {
        startsAt: 'desc',
      },
    },
  });

  async function confirmAction(formData: FormData) {
    'use server';
    const assignmentId = formData.get('assignmentId') as string;
    if (!assignmentId) return;

    await confirmAssignmentWithAudit({
      assignmentId,
      actorId: session?.userId,
    });

    revalidatePath('/minha-escala');
    revalidatePath('/');
  }

  async function declineAction(formData: FormData) {
    'use server';
    const assignmentId = formData.get('assignmentId') as string;
    const reason = formData.get('reason') as string;
    if (!assignmentId) return;

    await declineAssignmentWithAudit({
      assignmentId,
      reason,
      actorId: session?.userId,
    });

    revalidatePath('/minha-escala');
    revalidatePath('/');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Minha Escala</h1>
          <p className="text-sm text-ink-muted mt-1">
            Confira suas escalas agendadas, confirme sua presença ou avise sobre imprevistos.
          </p>
        </div>

        <CalendarSubscriptionButton />
      </div>

      {assignments.length === 0 ? (
        <div className="bg-surface rounded-surface border border-line p-8 text-center">
          <p className="text-ink-muted text-sm">
            Você não está escalado(a) nos próximos dias. Quando for, aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-surface border border-line divide-y divide-line overflow-hidden shadow-sm">
          {assignments.map((asg) => {
            const isPast = new Date(asg.slot.endsAt) < new Date();
            const startsAt = new Date(asg.slot.startsAt);
            const endsAt = new Date(asg.slot.endsAt);

            return (
              <div key={asg.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-display font-bold text-base sm:text-lg text-ink">
                      {asg.slot.program.title}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-control uppercase tracking-wider ${
                        asg.status === 'CONFIRMED'
                          ? 'bg-success-soft text-success-ink'
                          : asg.status === 'DECLINED'
                          ? 'bg-danger-soft text-danger-ink'
                          : asg.status === 'SUBSTITUTED'
                          ? 'bg-warning-soft text-warning-ink'
                          : 'bg-info-soft text-primary'
                      }`}
                    >
                      {asg.status === 'CONFIRMED'
                        ? 'Confirmado'
                        : asg.status === 'DECLINED'
                        ? 'Desmarcado'
                        : asg.status === 'SUBSTITUTED'
                        ? 'Substituído'
                        : 'Pendente'}
                    </span>
                  </div>

                  <p className="text-sm text-ink font-semibold">
                    {asg.slot.department.name} — {asg.slot.function?.name || asg.slot.title}
                  </p>

                  <p className="text-xs text-ink-muted">
                    {startsAt.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    •{' '}
                    {startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às{' '}
                    {endsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {asg.declinedReason && (
                    <p className="text-xs text-danger font-medium mt-1">
                      Motivo da desmarcação: {asg.declinedReason}
                    </p>
                  )}
                </div>

                {!isPast && asg.status !== 'DECLINED' && asg.status !== 'SUBSTITUTED' && (
                  <div className="flex items-center space-x-2">
                    {asg.status === 'PENDING' && (
                      <form action={confirmAction}>
                        <input type="hidden" name="assignmentId" value={asg.id} />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-success text-white font-semibold rounded-control text-xs sm:text-sm hover:opacity-95 min-h-touch"
                        >
                          Confirmar presença
                        </button>
                      </form>
                    )}

                    <form action={declineAction}>
                      <input type="hidden" name="assignmentId" value={asg.id} />
                      <input type="hidden" name="reason" value="Imprevisto informado pelo voluntário" />
                      <button
                        type="submit"
                        className="px-3.5 py-2 border border-line text-ink-muted hover:text-danger hover:border-danger font-semibold rounded-control text-xs sm:text-sm min-h-touch transition-colors"
                      >
                        Desmarcar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
