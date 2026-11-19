import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { bookingIdSchema, createBookingSchema } from './bookings.schemas';
import * as bookingsService from './bookings.service';

/** Mounted at /api/v1/events/:id/bookings */
export const eventBookingsRouter = Router({ mergeParams: true });

eventBookingsRouter.post(
  '/',
  requireAuth,
  validate(createBookingSchema),
  asyncHandler(async (req, res) => {
    const booking = await bookingsService.createBooking(Number(req.params.id), currentUser(req).id, req.body);
    res.status(201).json({ booking });
  }),
);

/** Mounted at /api/v1/bookings */
export const bookingsRouter = Router();

bookingsRouter.use(requireAuth);

bookingsRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ data: await bookingsService.listMyBookings(currentUser(req).id) });
  }),
);

bookingsRouter.post(
  '/:id/cancel',
  validate(bookingIdSchema),
  asyncHandler(async (req, res) => {
    res.json({ booking: await bookingsService.cancelBooking(Number(req.params.id), currentUser(req).id) });
  }),
);
