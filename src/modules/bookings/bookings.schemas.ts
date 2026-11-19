import { z } from 'zod';

export const createBookingSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    seats: z.number().int().min(1).max(10).default(1),
  }),
});

export const bookingIdSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>['body'];
