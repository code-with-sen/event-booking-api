import { pool, withTransaction } from '../../db/pool';
import { conflict, notFound, unprocessable } from '../../lib/errors';
import type { CreateBookingInput } from './bookings.schemas';

export interface Booking {
  id: number;
  eventId: number;
  userId: number;
  seats: number;
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
  cancelledAt: Date | null;
}

const BOOKING_COLUMNS = `
  id::int AS id,
  event_id::int AS "eventId",
  user_id::int AS "userId",
  seats, status,
  created_at AS "createdAt",
  cancelled_at AS "cancelledAt"`;

/**
 * Books seats for an event without ever overbooking, even under concurrent requests.
 *
 * `SELECT ... FOR UPDATE` takes a row lock on the event, so concurrent bookings for the
 * same event are serialised: each transaction sees the seat count left by the previous one.
 * Bookings for *different* events don't block each other.
 */
export async function createBooking(eventId: number, userId: number, input: CreateBookingInput) {
  return withTransaction(async (client) => {
    const { rows: events } = await client.query<{ capacity: number; seatsBooked: number; startsAt: Date }>(
      `SELECT capacity, seats_booked AS "seatsBooked", starts_at AS "startsAt"
       FROM events WHERE id = $1 FOR UPDATE`,
      [eventId],
    );
    const event = events[0];
    if (!event) throw notFound('Event');
    if (event.startsAt.getTime() <= Date.now()) throw unprocessable('This event has already started');

    const seatsLeft = event.capacity - event.seatsBooked;
    if (input.seats > seatsLeft) {
      throw conflict(seatsLeft === 0 ? 'This event is sold out' : `Only ${seatsLeft} seat(s) left`);
    }

    // The partial unique index rejects a second active booking by the same user (-> 409).
    const { rows } = await client.query<Booking>(
      `INSERT INTO bookings (event_id, user_id, seats) VALUES ($1, $2, $3) RETURNING ${BOOKING_COLUMNS}`,
      [eventId, userId, input.seats],
    );

    await client.query('UPDATE events SET seats_booked = seats_booked + $1 WHERE id = $2', [
      input.seats,
      eventId,
    ]);

    return rows[0];
  });
}

export async function cancelBooking(bookingId: number, userId: number) {
  return withTransaction(async (client) => {
    const { rows } = await client.query<Booking>(
      `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [bookingId, userId],
    );
    const booking = rows[0];
    // 404 (not 403) for other users' bookings, so booking IDs can't be probed.
    if (!booking) throw notFound('Booking');
    if (booking.status === 'cancelled') throw conflict('Booking is already cancelled');

    const { rows: updated } = await client.query<Booking>(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = now()
       WHERE id = $1 RETURNING ${BOOKING_COLUMNS}`,
      [bookingId],
    );
    await client.query('UPDATE events SET seats_booked = seats_booked - $1 WHERE id = $2', [
      booking.seats,
      booking.eventId,
    ]);

    return updated[0];
  });
}

export async function listMyBookings(userId: number) {
  const { rows } = await pool.query(
    `SELECT b.id::int AS id, b.seats, b.status,
            b.created_at AS "createdAt", b.cancelled_at AS "cancelledAt",
            json_build_object(
              'id', e.id, 'title', e.title, 'venue', e.venue, 'startsAt', e.starts_at
            ) AS event
     FROM bookings b JOIN events e ON e.id = b.event_id
     WHERE b.user_id = $1
     ORDER BY e.starts_at ASC`,
    [userId],
  );
  return rows;
}
