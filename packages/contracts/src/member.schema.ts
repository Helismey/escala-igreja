import { z } from 'zod';
import { addressSchema, emergencyContactSchema, phoneRegex } from './auth.schema.js';

export const updateMemberSchema = z.object({
  name: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome muito longo').optional(),
  photoUrl: z.string().trim().url('URL da foto inválida').max(500, 'URL muito longa').optional().nullable().or(z.literal('')),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento deve estar no formato AAAA-MM-DD').optional().nullable().or(z.literal('')),
  gender: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']).optional().nullable(),
  maritalStatus: z.enum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'OUTRO']).optional().nullable(),
  phonePrimary: z.string().trim().regex(phoneRegex, 'Telefone principal deve estar no padrão internacional (+55...)').optional(),
  phoneSecondary: z.string().trim().regex(phoneRegex, 'Telefone secundário inválido').optional().nullable().or(z.literal('')),
  whatsapp: z.string().trim().regex(phoneRegex, 'WhatsApp deve estar no padrão internacional (+55...)').optional().nullable().or(z.literal('')),
  address: addressSchema.optional().nullable(),
  emergencyContact: emergencyContactSchema.optional().nullable(),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de entrada ou batismo inválida').optional().nullable().or(z.literal('')),
  preferredChannel: z.enum(['WHATSAPP', 'EMAIL', 'PUSH', 'SMS']).optional(),
  notes: z.string().max(500, 'Observações não podem ultrapassar 500 caracteres').optional().nullable(),
  optOutWhatsapp: z.boolean().optional(),
  optOutEmail: z.boolean().optional(),
  optOutPush: z.boolean().optional(),
  optOutSms: z.boolean().optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const approveMemberSchema = z.object({
  userId: z.string().min(1, 'ID do usuário obrigatório'),
  departmentId: z.string().min(1, 'Departamento obrigatório'),
  functionIds: z.array(z.string()).default([]),
});

export type ApproveMemberInput = z.infer<typeof approveMemberSchema>;

export const rejectMemberSchema = z.object({
  userId: z.string().min(1, 'ID do usuário obrigatório'),
  reason: z.string().max(200).optional(),
});

export type RejectMemberInput = z.infer<typeof rejectMemberSchema>;

export const eraseUserDataSchema = z.object({
  password: z.string().min(1, 'A senha é obrigatória para confirmar a exclusão'),
  reason: z.string().max(200).optional(),
});

export type EraseUserDataInput = z.infer<typeof eraseUserDataSchema>;

