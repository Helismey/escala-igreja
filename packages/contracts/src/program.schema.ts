import { z } from 'zod';

export const programSlotInputSchema = z.object({
  title: z.string().trim().min(2, 'Título da parte ou função obrigatório').max(80),
  departmentId: z.string().min(1, 'Departamento obrigatório'),
  functionId: z.string().optional().nullable(),
  startsAt: z.string().datetime('Data e hora de início inválida'),
  endsAt: z.string().datetime('Data e hora de término inválida'),
  requiredCount: z.number().int().min(1).max(20).default(1),
}).refine((slot) => new Date(slot.startsAt) < new Date(slot.endsAt), {
  message: 'O horário de início deve ser anterior ao horário de término',
  path: ['endsAt'],
});

export type ProgramSlotInput = z.infer<typeof programSlotInputSchema>;

export const createProgramSchema = z.object({
  title: z.string().trim().min(3, 'Título do programa deve ter no mínimo 3 caracteres').max(100),
  date: z.string().datetime('Data do programa inválida'),
  departmentIds: z.array(z.string()).min(1, 'Selecione pelo menos um departamento'),
  slots: z.array(programSlotInputSchema).default([]),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;

export const cloneProgramSchema = z.object({
  programId: z.string().min(1, 'Programa original obrigatório'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de destino deve estar no formato AAAA-MM-DD'),
});

export type CloneProgramInput = z.infer<typeof cloneProgramSchema>;
