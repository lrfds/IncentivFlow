import { z } from 'zod';

export const ClientFormSchema = z.object({
  cnpj: z.string().min(14, 'CNPJ deve ter 14 dígitos').max(18),
  razaoSocial: z.string().min(3, 'Razão social muito curta'),
  nomeFantasia: z.string().optional(),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
});

export type ClientFormData = z.infer<typeof ClientFormSchema>;
