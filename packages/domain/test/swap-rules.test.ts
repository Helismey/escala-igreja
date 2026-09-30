import { describe, it, expect } from 'vitest';
import {
  canRespondSwap,
  canReviewSwap,
  canCancelSwap,
  validateSwapProposal,
} from '../src/scheduling/swap-rules.js';

describe('Regras de Troca de Escala (Swap Rules)', () => {
  it('deve permitir apenas ao voluntário alvo responder ao pedido pendente', () => {
    const swap = {
      id: 'swap-1',
      requesterId: 'user-pedro',
      targetUserId: 'user-maria',
      status: 'PENDING_TARGET' as const,
    };

    expect(canRespondSwap(swap, 'user-maria')).toBe(true);
    expect(canRespondSwap(swap, 'user-pedro')).toBe(false);
    expect(canRespondSwap(swap, 'outro-user')).toBe(false);
  });

  it('deve permitir resposta a pedido aberto a toda a equipe por qualquer outro voluntário', () => {
    const openSwap = {
      id: 'swap-open',
      requesterId: 'user-pedro',
      targetUserId: null,
      status: 'PENDING_TARGET' as const,
    };

    expect(canRespondSwap(openSwap, 'user-maria')).toBe(true);
    expect(canRespondSwap(openSwap, 'user-pedro')).toBe(false); // O solicitante não pode aceitar o próprio pedido
  });

  it('deve permitir revisão de gestor apenas em pedidos com aceite do colega', () => {
    const pendingTarget = {
      id: 'swap-1',
      requesterId: 'user-1',
      targetUserId: 'user-2',
      status: 'PENDING_TARGET' as const,
    };
    const pendingManager = {
      id: 'swap-2',
      requesterId: 'user-1',
      targetUserId: 'user-2',
      status: 'PENDING_MANAGER' as const,
    };

    expect(canReviewSwap(pendingTarget, true)).toBe(false); // Ainda não aceito pelo colega
    expect(canReviewSwap(pendingManager, false)).toBe(false); // Não é gestor nem admin
    expect(canReviewSwap(pendingManager, true)).toBe(true); // Gestor pode aprovar
  });

  it('deve validar elegibilidade do alvo para o slot da escala de origem', () => {
    const slot = {
      id: 'slot-1',
      departmentId: 'dept-midia',
      functionId: 'func-camera',
      startsAt: new Date('2026-10-25T18:00:00Z'),
      endsAt: new Date('2026-10-25T20:00:00Z'),
    };

    const targetSemFuncao = {
      id: 'user-alvo',
      name: 'Lucas',
      status: 'ACTIVE' as const,
      departmentMemberships: [
        {
          departmentId: 'dept-midia',
          functions: [{ functionId: 'func-som' }], // Não tem a função de câmera
        },
      ],
      availabilities: [],
      assignments: [],
    };

    const result = validateSwapProposal({
      requesterId: 'user-requester',
      targetCandidate: targetSemFuncao,
      originSlot: slot,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('função requerida');
  });
});
