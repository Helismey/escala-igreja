import { z } from 'zod';

export const triggerRemindersSchema = z.object({
  referenceDate: z.string().datetime().optional(),
  dryRun: z.boolean().optional(),
});

export type TriggerRemindersInput = z.infer<typeof triggerRemindersSchema>;

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url('Endpoint de push deve ser uma URL válida'),
  keys: z.object({
    p256dh: z.string().min(1, 'Chave p256dh obrigatória'),
    auth: z.string().min(1, 'Chave auth obrigatória'),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const unsubscribePushSchema = z.object({
  endpoint: z.string().url('Endpoint de push deve ser uma URL válida'),
});

export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>;

export const updateFeatureFlagSchema = z.object({
  key: z.string().min(1, 'Chave da flag obrigatória'),
  enabled: z.boolean({ required_error: 'O estado da flag (ativada/desativada) é obrigatório' }),
});

export type UpdateFeatureFlagInput = z.infer<typeof updateFeatureFlagSchema>;

export const sendTestNotificationSchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL', 'PUSH', 'SMS'], {
    errorMap: () => ({ message: 'Canal inválido. Escolha WHATSAPP, EMAIL, PUSH ou SMS.' }),
  }),
  targetUserId: z.string().min(1, 'Usuário de destino obrigatório'),
});

export type SendTestNotificationInput = z.infer<typeof sendTestNotificationSchema>;
