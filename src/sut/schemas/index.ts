import { z } from 'zod';

export const articleSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  body: z.string().min(1),
  // GAD tiene un registro con user_id string ('3') en el dataset por defecto.
  user_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  date: z.string().min(1),
  image: z.string(),
});

export const articleListSchema = z.array(articleSchema);

export const loginResponseSchema = z.object({
  access_token: z.string().min(10),
});

export const loginErrorSchema = z.object({
  status: z.number().int(),
  message: z.string().min(1),
});
