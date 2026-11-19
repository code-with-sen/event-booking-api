import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  body: z.object({
    email,
    name: z.string().trim().min(1).max(100),
    password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1).max(72),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
