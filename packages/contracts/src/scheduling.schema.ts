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

export const generateSchedulePreviewSchema = z.object({
  programId: z.string().min(1, 'Programa obrigatório'),
  departmentId: z.string().optional(),
});

export type GenerateSchedulePreviewInput = z.infer<typeof generateSchedulePreviewSchema>;

export const applyAutoScheduleSchema = z.object({
  programId: z.string().min(1, 'Programa obrigatório'),
  assignments: z
    .array(
      z.object({
        slotId: z.string().min(1, 'Slot obrigatório'),
        userId: z.string().min(1, 'Voluntário obrigatório'),
      })
    )
    .min(1, 'Ao menos uma escala deve ser atribuída'),
});

export type ApplyAutoScheduleInput = z.infer<typeof applyAutoScheduleSchema>;

export const approveScheduleSchema = z.object({
  assignmentIds: z.array(z.string().min(1)).min(1, 'Selecione pelo menos uma escala para aprovar'),
});

export type ApproveScheduleInput = z.infer<typeof approveScheduleSchema>;

export const adjustAndApproveScheduleSchema = z.object({
  assignmentId: z.string().min(1, 'Escala obrigatória'),
  newUserId: z.string().min(1, 'Novo voluntário obrigatório'),
});

export type AdjustAndApproveScheduleInput = z.infer<typeof adjustAndApproveScheduleSchema>;

export const rejectScheduleSchema = z.object({
  assignmentIds: z.array(z.string().min(1)).min(1, 'Selecione pelo menos uma escala para rejeitar'),
  reason: z.string().max(200, 'Motivo deve ter no máximo 200 caracteres').optional(),
});

export type RejectScheduleInput = z.infer<typeof rejectScheduleSchema>;


