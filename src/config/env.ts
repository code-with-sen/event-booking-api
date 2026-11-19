import 'dotenv/config';
import { z } from 'zod';

// Fail fast on startup if the environment is misconfigured,
// instead of crashing later on the first request that needs a value.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  // Comma-separated list of origins allowed to call the API from a browser, or * for any.
  // Auth uses bearer tokens, not cookies, so * is safe; set it to the frontend URL to be strict.
  CORS_ORIGINS: z
    .string()
    .default('*')
    .transform((v) => (v.trim() === '*' ? '*' : v.split(',').map((o) => o.trim()).filter(Boolean))),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
