import { z } from 'zod';

const idParam = z.object({ id: z.coerce.number().int().positive() });

const eventFields = {
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).default(''),
  venue: z.string().trim().min(1).max(200),
  startsAt: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now(), { message: 'startsAt must be in the future' }),
  capacity: z.number().int().min(1).max(100_000),
};

export const createEventSchema = z.object({
  body: z.object(eventFields),
});

export const updateEventSchema = z.object({
  params: idParam,
  body: z
    .object({
      title: eventFields.title,
      description: z.string().trim().max(5000),
      venue: eventFields.venue,
      startsAt: eventFields.startsAt,
      capacity: eventFields.capacity,
    })
    .partial()
    .refine((b) => Object.keys(b).length > 0, { message: 'Provide at least one field to update' }),
});

export const eventIdSchema = z.object({ params: idParam });

export const listEventsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    // By default only upcoming events are listed.
    includePast: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    q: z.string().trim().max(100).optional(),
  }),
});

export type CreateEventInput = z.infer<typeof createEventSchema>['body'];
export type UpdateEventInput = z.infer<typeof updateEventSchema>['body'];
export type ListEventsQuery = z.infer<typeof listEventsSchema>['query'];
