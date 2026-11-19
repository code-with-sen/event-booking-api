import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createEventSchema,
  eventIdSchema,
  ListEventsQuery,
  listEventsSchema,
  updateEventSchema,
} from './events.schemas';
import * as eventsService from './events.service';

export const eventsRouter = Router();

eventsRouter.get(
  '/',
  validate(listEventsSchema),
  asyncHandler(async (req, res) => {
    res.json(await eventsService.listEvents(req.query as unknown as ListEventsQuery));
  }),
);

eventsRouter.get(
  '/:id',
  validate(eventIdSchema),
  asyncHandler(async (req, res) => {
    res.json({ event: await eventsService.getEvent(Number(req.params.id)) });
  }),
);

eventsRouter.post(
  '/',
  requireAuth,
  validate(createEventSchema),
  asyncHandler(async (req, res) => {
    const event = await eventsService.createEvent(currentUser(req).id, req.body);
    res.status(201).location(`/api/v1/events/${event.id}`).json({ event });
  }),
);

eventsRouter.patch(
  '/:id',
  requireAuth,
  validate(updateEventSchema),
  asyncHandler(async (req, res) => {
    const event = await eventsService.updateEvent(Number(req.params.id), currentUser(req).id, req.body);
    res.json({ event });
  }),
);

eventsRouter.delete(
  '/:id',
  requireAuth,
  validate(eventIdSchema),
  asyncHandler(async (req, res) => {
    await eventsService.deleteEvent(Number(req.params.id), currentUser(req).id);
    res.status(204).end();
  }),
);

eventsRouter.get(
  '/:id/bookings',
  requireAuth,
  validate(eventIdSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await eventsService.listEventBookings(Number(req.params.id), currentUser(req).id) });
  }),
);
