import { z } from 'zod';

export const assignMemberSchema = z.object({
  slotId: z.string().min(1, 'Slot obrigatório'),
  userId: z.string().min(1, 'Voluntário obrigatório'),
});

export type AssignMemberInput = z.infer<typeof assignMemberSchema>;

export const removeAssignmentSchema = z.object({
  assignmentId: z.string().min(1, 'Escala obrigatória'),
});

export type RemoveAssignmentInput = z.infer<typeof removeAssignmentSchema>;

export const declineAssignmentSchema = z.object({
  assignmentId: z.string().min(1, 'Escala obrigatória'),
  reason: z.string().max(200, 'Motivo deve ter no máximo 200 caracteres').optional(),
});

export type DeclineAssignmentInput = z.infer<typeof declineAssignmentSchema>;

export const confirmAssignmentSchema = z.object({
  assignmentId: z.string().min(1, 'Escala obrigatória'),
});

export type ConfirmAssignmentInput = z.infer<typeof confirmAssignmentSchema>;
