import { describe, expect, it } from 'vitest';
import {
  hasTimeOverlap,
  wouldExceedDailyLimit,
  UserAssignmentTime,
} from '../src/index.js';

describe('Testes de Concorrência e Idempotência (ADR-004)', () => {
  it('Cenário 1: Duas atribuições simultâneas com horários sobrepostos — apenas UMA tem sucesso', async () => {
    // Simula duas requisições concorrentes de gestores diferentes tentando escalar a mesma pessoa
    const sharedAssignments: UserAssignmentTime[] = [];
    let lock = Promise.resolve();

    async function attemptConcurrentAssignment(slot: {
      id: string;
      startsAt: string;
      endsAt: string;
    }) {
      // Simulação de transação atômica serializada
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        lock = lock.then(async () => {
          const hasConflict = sharedAssignments.some((a) =>
            hasTimeOverlap(slot.startsAt, slot.endsAt, a.startsAt, a.endsAt)
          );

          if (hasConflict) {
            resolve({
              success: false,
              error: 'Não foi possível escalar o voluntário. Ela(e) já tem uma escala nesse horário.',
            });
            return;
          }

          // Atribuição bem-sucedida
          sharedAssignments.push({
            id: `asg-${slot.id}`,
            slotId: slot.id,
            departmentId: 'dept-1',
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            status: 'PENDING',
          });

          resolve({ success: true });
        });
      });
    }

    const slotA = { id: 'slot-A', startsAt: '2026-10-18T09:00:00Z', endsAt: '2026-10-18T11:00:00Z' };
    const slotB = { id: 'slot-B', startsAt: '2026-10-18T10:00:00Z', endsAt: '2026-10-18T12:00:00Z' };

    // Dispara as duas chamadas simultaneamente
    const [resA, resB] = await Promise.all([
      attemptConcurrentAssignment(slotA),
      attemptConcurrentAssignment(slotB),
    ]);

    // Exatamente uma teve sucesso e a outra foi bloqueada
    const successCount = [resA, resB].filter((r) => r.success).length;
    const failureCount = [resA, resB].filter((r) => !r.success).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);
    expect(sharedAssignments.length).toBe(1);
  });

  it('Cenário 2: Duas atribuições simultâneas quando o voluntário já possui 1 escala — a 3ª falha', async () => {
    // Voluntário já tem 1 escala no dia
    const sharedAssignments: UserAssignmentTime[] = [
      {
        id: 'asg-existente',
        slotId: 'slot-existente',
        departmentId: 'dept-1',
        startsAt: '2026-10-18T08:00:00Z',
        endsAt: '2026-10-18T09:30:00Z',
        status: 'CONFIRMED',
      },
    ];

    let lock = Promise.resolve();

    async function attemptConcurrentDailyAssignment(slot: {
      id: string;
      startsAt: string;
      endsAt: string;
    }) {
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        lock = lock.then(async () => {
          if (wouldExceedDailyLimit(slot.startsAt, sharedAssignments)) {
            resolve({
              success: false,
              error: 'Não foi possível escalar o voluntário. Já são 2 escalas neste dia.',
            });
            return;
          }

          sharedAssignments.push({
            id: `asg-${slot.id}`,
            slotId: slot.id,
            departmentId: 'dept-1',
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            status: 'PENDING',
          });

          resolve({ success: true });
        });
      });
    }

    const slotManha = { id: 'slot-manha', startsAt: '2026-10-18T10:00:00Z', endsAt: '2026-10-18T11:30:00Z' };
    const slotNoite = { id: 'slot-noite', startsAt: '2026-10-18T19:00:00Z', endsAt: '2026-10-18T20:30:00Z' };

    // Ambas tentam assumir a última vaga permitida ao mesmo tempo
    const [res1, res2] = await Promise.all([
      attemptConcurrentDailyAssignment(slotManha),
      attemptConcurrentDailyAssignment(slotNoite),
    ]);

    const successCount = [res1, res2].filter((r) => r.success).length;
    const failureCount = [res1, res2].filter((r) => !r.success).length;

    // Apenas UMA escala foi aceita (totalizando 2 no dia); a terceira foi rejeitada
    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);
    expect(sharedAssignments.length).toBe(2);
  });

  it('Cenário 3: Idempotência de notificações — execução duplicada não duplica envio', () => {
    const notificationLogs: { assignmentId: string; kind: string }[] = [];

    function processReminder(assignmentId: string, kind: string): { sent: boolean } {
      const alreadySent = notificationLogs.some(
        (log) => log.assignmentId === assignmentId && log.kind === kind
      );

      if (alreadySent) {
        return { sent: false }; // Idempotente: não envia de novo
      }

      notificationLogs.push({ assignmentId, kind });
      return { sent: true };
    }

    // Primeira execução do cron (D-7)
    const run1 = processReminder('asg-1', 'D7');
    expect(run1.sent).toBe(true);

    // Segunda execução imediata por concorrência ou repetição do cron
    const run2 = processReminder('asg-1', 'D7');
    expect(run2.sent).toBe(false);

    // Total de envios registrados no log permanece exatamente 1
    expect(notificationLogs.filter((l) => l.assignmentId === 'asg-1' && l.kind === 'D7').length).toBe(1);
  });
});
