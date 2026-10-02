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
  churchId: z.string().optional(),
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

export const recurrenceRuleSchema = z
  .object({
    mode: z.enum(['WEEKLY_DAYS', 'DAILY_RANGE']),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial deve estar no formato AAAA-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final deve estar no formato AAAA-MM-DD'),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  })
  .refine((r) => r.startDate <= r.endDate, {
    message: 'A data inicial deve ser anterior ou igual à data final',
    path: ['endDate'],
  });

export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleSchema>;

export const programSlotTemplateSchema = z
  .object({
    title: z.string().trim().min(2, 'Título da parte ou função obrigatório').max(80),
    departmentId: z.string().min(1, 'Departamento obrigatório'),
    functionId: z.string().optional().nullable(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário de início no formato HH:MM (ex: 09:00)'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário de término no formato HH:MM (ex: 10:30)'),
    requiredCount: z.number().int().min(1).max(20).default(1),
  })
  .refine((slot) => slot.startTime < slot.endTime, {
    message: 'O horário de início deve ser anterior ao horário de término',
    path: ['endTime'],
  });

export type ProgramSlotTemplateInput = z.infer<typeof programSlotTemplateSchema>;

export const createBatchProgramsSchema = z.object({
  title: z.string().trim().min(3, 'Título do programa deve ter no mínimo 3 caracteres').max(100),
  churchId: z.string().optional(),
  departmentIds: z.array(z.string()).min(1, 'Selecione pelo menos um departamento'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário do programa no formato HH:MM').default('09:00'),
  recurrence: recurrenceRuleSchema,
  slots: z.array(programSlotTemplateSchema).default([]),
});

export type CreateBatchProgramsInput = z.infer<typeof createBatchProgramsSchema>;

