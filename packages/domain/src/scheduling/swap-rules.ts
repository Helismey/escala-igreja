import { CandidateUser, SlotRequirement, checkEligibility } from './eligibility.js';

export interface SwapRequestState {
  id: string;
  requesterId: string;
  targetUserId?: string | null;
  status: 'PENDING_TARGET' | 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
}

/**
 * Avalia se o usuário logado tem permissão para responder (aceitar/recusar) a um pedido de troca.
 */
export function canRespondSwap(swap: SwapRequestState, currentUserId: string): boolean {
  if (swap.status !== 'PENDING_TARGET') {
    return false;
  }

  // O solicitante não pode responder ao próprio pedido
  if (swap.requesterId === currentUserId) {
    return false;
  }

  // Se for pedido direcionado a um voluntário específico, apenas ele pode responder
  if (swap.targetUserId) {
    return swap.targetUserId === currentUserId;
  }

  // Se targetUserId for nulo, é um pedido aberto para qualquer colega da equipe
  return true;
}

/**
 * Avalia se o gestor ou admin pode revisar (aprovar/rejeitar) o pedido de troca.
 */
export function canReviewSwap(swap: SwapRequestState, isManagerOrAdmin: boolean): boolean {
  if (!isManagerOrAdmin) {
    return false;
  }

  // Só pode ser revisado após o aceite do colega de equipe
  return swap.status === 'PENDING_MANAGER';
}

/**
 * Avalia se o solicitante pode cancelar o pedido de troca.
 */
export function canCancelSwap(swap: SwapRequestState, currentUserId: string): boolean {
  if (swap.requesterId !== currentUserId) {
    return false;
  }

  // Pode cancelar enquanto estiver pendente do colega ou do gestor
  return swap.status === 'PENDING_TARGET' || swap.status === 'PENDING_MANAGER';
}

export interface ValidateSwapOptions {
  requesterId: string;
  targetCandidate: CandidateUser;
  originSlot: SlotRequirement;
}

/**
 * Valida se um voluntário alvo pode assumir o slot de origem proposto na troca.
 */
export function validateSwapProposal(options: ValidateSwapOptions): { valid: boolean; error?: string } {
  const { requesterId, targetCandidate, originSlot } = options;

  if (targetCandidate.id === requesterId) {
    return { valid: false, error: 'Não é possível solicitar troca para si mesmo.' };
  }

  const check = checkEligibility(targetCandidate, originSlot);
  if (!check.eligible) {
    return { valid: false, error: check.reason || 'O voluntário selecionado não é elegível para este slot.' };
  }

  return { valid: true };
}
