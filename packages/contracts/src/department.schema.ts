import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Nome do departamento deve ter no mínimo 2 caracteres').max(60),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(60),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const createFunctionSchema = z.object({
  departmentId: z.string().min(1, 'Departamento obrigatório'),
  name: z.string().trim().min(2, 'Nome da função deve ter no mínimo 2 caracteres').max(60),
});

export type CreateFunctionInput = z.infer<typeof createFunctionSchema>;

export const assignManagerSchema = z.object({
  departmentId: z.string().min(1),
  userId: z.string().min(1),
});

export type AssignManagerInput = z.infer<typeof assignManagerSchema>;
