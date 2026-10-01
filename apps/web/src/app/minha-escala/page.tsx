import React from 'react';
import Link from 'next/link';
import { prisma, confirmAssignmentWithAudit, declineWithAutoSubstitution } from '@escala-igreja/db';
import { detectVolunteerOverload } from '@escala-igreja/domain';
import { getSession } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { CalendarSubscriptionButton } from '@/components/CalendarSubscriptionButton';
import { notifyAutoSubstitution } from '@/services/notifications/swap-and-sub-notifications';

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

  const overloadAlert = detectVolunteerOverload(
    assignments.map((a) => ({
      id: a.id,
      startsAt: a.slot.startsAt,
      endsAt: a.slot.endsAt,
      status: a.status,
    }))
  );

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

    const result = await declineWithAutoSubstitution({
      assignmentId,
      reason,
      actorId: session?.userId,
    });

    if (result.autoSubstituted && result.newAssignment) {
      notifyAutoSubstitution({
        substituteAssignmentId: result.newAssignment.id,
        originalAssignmentId: assignmentId,
        reason,
        actorId: session?.userId,
      }).catch((err) => console.error('Erro ao notificar substituto:', err));
    }

    revalidatePath('/minha-escala');
    revalidatePath('/');
    revalidatePath('/slots-abertos');
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

      {overloadAlert.isOverloaded && (
        <div className="bg-warning-soft/40 border border-warning/50 rounded-surface p-4 flex items-start gap-3">
          <span className="text-xl">🕊️</span>
          <div>
            <h3 className="font-semibold text-sm text-warning-ink">
              Atenção para o seu descanso
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Você serviu em {overloadAlert.consecutiveWeekends} fins de semana seguidos ({overloadAlert.assignmentsIn30Days} escalas no mês). Lembre-se de reservar momentos de descanso e culto com sua família.
            </p>
          </div>
        </div>
      )}

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
                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
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

                    <Link
                      href="/trocas"
                      className="px-3.5 py-2 border border-line text-ink-muted hover:text-primary hover:border-primary font-semibold rounded-control text-xs sm:text-sm min-h-touch transition-colors flex items-center gap-1"
                    >
                      ⇄ Pedir Troca
                    </Link>

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
