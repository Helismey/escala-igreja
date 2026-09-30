import { z } from 'zod';

export const updatePreferredWeekdaysSchema = z.object({
  targetUserId: z.string().optional(),
  weekdays: z
    .array(z.number().int().min(0, 'Dia deve estar entre 0 e 6').max(6, 'Dia deve estar entre 0 e 6'))
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'Não é permitido repetir dias da semana nas preferências',
    }),
});

export type UpdatePreferredWeekdaysInput = z.infer<typeof updatePreferredWeekdaysSchema>;

export const addUnavailablePeriodSchema = z
  .object({
    targetUserId: z.string().optional(),
    from: z.string().datetime({ message: 'Data de início em formato inválido' }),
    to: z.string().datetime({ message: 'Data de término em formato inválido' }),
  })
  .refine(
    (data) => new Date(data.from).getTime() <= new Date(data.to).getTime(),
    {
      message: 'A data de término deve ser posterior ou igual à data de início',
      path: ['to'],
    }
  );

export type AddUnavailablePeriodInput = z.infer<typeof addUnavailablePeriodSchema>;

export const removeUnavailablePeriodSchema = z.object({
  targetUserId: z.string().optional(),
  availabilityId: z.string().min(1, 'Identificador do período é obrigatório'),
});

export type RemoveUnavailablePeriodInput = z.infer<typeof removeUnavailablePeriodSchema>;
