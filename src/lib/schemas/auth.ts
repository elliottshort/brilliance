import { z } from 'zod'

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .describe('Username: 3-30 chars, alphanumeric + underscores'),
  password: z
    .string()
    .min(8)
    .describe('Password: minimum 8 characters'),
})

export const LoginSchema = z.object({
  username: z
    .string()
    .min(1)
    .describe('Username'),
  password: z
    .string()
    .min(1)
    .describe('Password'),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
