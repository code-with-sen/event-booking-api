import request from 'supertest';
import { pool } from '../src/db/pool';
import { app, createEvent, createUser, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => pool.end());

const book = (eventId: number, token: string, seats = 1) =>
  request(app).post(`/api/v1/events/${eventId}/bookings`).set('Authorization', `Bearer ${token}`).send({ seats });

describe('bookings', () => {
  it('books seats and updates availability', async () => {
    const organizer = await createUser();
    const attendee = await createUser();
    const event = await createEvent(organizer.token, { capacity: 10 });

    const res = await book(event.id, attendee.token, 3).expect(201);
    expect(res.body.booking).toMatchObject({ eventId: event.id, userId: attendee.user.id, seats: 3, status: 'confirmed' });

    const after = await request(app).get(`/api/v1/events/${event.id}`).expect(200);
    expect(after.body.event).toMatchObject({ seatsBooked: 3, seatsAvailable: 7 });
  });

  it('rejects booking more seats than are left', async () => {
    const organizer = await createUser();
    const a = await createUser();
    const b = await createUser();
    const event = await createEvent(organizer.token, { capacity: 4 });

    await book(event.id, a.token, 3).expect(201);
    const res = await book(event.id, b.token, 2).expect(409);
    expect(res.body.error.message).toBe('Only 1 seat(s) left');
  });

  it('allows only one active booking per user per event', async () => {
    const organizer = await createUser();
    const attendee = await createUser();
    const event = await createEvent(organizer.token);

    await book(event.id, attendee.token).expect(201);
    const res = await book(event.id, attendee.token).expect(409);
    expect(res.body.error.message).toMatch(/already have an active booking/);
  });

  it('never overbooks under concurrent requests', async () => {
    const organizer = await createUser();
    const event = await createEvent(organizer.token, { capacity: 5 });
    const attendees = await Promise.all(Array.from({ length: 20 }, () => createUser()));

    // 20 users race for 5 seats at the same time.
    const results = await Promise.all(attendees.map((a) => book(event.id, a.token)));
    const statuses = results.map((r) => r.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(5);
    expect(statuses.filter((s) => s === 409)).toHaveLength(15);
    // Every loser must be rejected by the application's seat check (which relies on the row lock),
    // not by the database CHECK constraint, which is only the last line of defence.
    for (const r of results.filter((r) => r.status === 409)) {
      expect(r.body.error.message).toMatch(/sold out|seat\(s\) left/);
    }

    const { rows } = await pool.query(
      `SELECT e.seats_booked, (SELECT COALESCE(SUM(seats), 0)::int FROM bookings
                                WHERE event_id = e.id AND status = 'confirmed') AS confirmed
       FROM events e WHERE e.id = $1`,
      [event.id],
    );
    expect(rows[0]).toEqual({ seats_booked: 5, confirmed: 5 });
  });

  it('cancels a booking, frees the seats and allows rebooking', async () => {
    const organizer = await createUser();
    const attendee = await createUser();
    const event = await createEvent(organizer.token, { capacity: 2 });

    const { body } = await book(event.id, attendee.token, 2).expect(201);
    const cancel = await request(app)
      .post(`/api/v1/bookings/${body.booking.id}/cancel`)
      .set('Authorization', `Bearer ${attendee.token}`)
      .expect(200);
    expect(cancel.body.booking.status).toBe('cancelled');

    const after = await request(app).get(`/api/v1/events/${event.id}`).expect(200);
    expect(after.body.event.seatsAvailable).toBe(2);

    await request(app)
      .post(`/api/v1/bookings/${body.booking.id}/cancel`)
      .set('Authorization', `Bearer ${attendee.token}`)
      .expect(409);
    await book(event.id, attendee.token, 1).expect(201);
  });

  it("does not let users cancel someone else's booking", async () => {
    const organizer = await createUser();
    const attendee = await createUser();
    const stranger = await createUser();
    const event = await createEvent(organizer.token);
    const { body } = await book(event.id, attendee.token).expect(201);

    await request(app)
      .post(`/api/v1/bookings/${body.booking.id}/cancel`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .expect(404);
  });

  it('lists my bookings and lets only the organizer see attendees', async () => {
    const organizer = await createUser();
    const attendee = await createUser({ name: 'Riya' });
    const event = await createEvent(organizer.token);
    await book(event.id, attendee.token, 2).expect(201);

    const mine = await request(app).get('/api/v1/bookings/me').set('Authorization', `Bearer ${attendee.token}`).expect(200);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].event.title).toBe('TypeScript Meetup');

    const attendees = await request(app)
      .get(`/api/v1/events/${event.id}/bookings`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200);
    expect(attendees.body.data[0]).toMatchObject({ userName: 'Riya', seats: 2 });

    await request(app)
      .get(`/api/v1/events/${event.id}/bookings`)
      .set('Authorization', `Bearer ${attendee.token}`)
      .expect(403);
  });

  it('prevents lowering capacity below seats already booked', async () => {
    const organizer = await createUser();
    const attendee = await createUser();
    const event = await createEvent(organizer.token, { capacity: 5 });
    await book(event.id, attendee.token, 4).expect(201);

    const res = await request(app)
      .patch(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ capacity: 3 })
      .expect(409);
    expect(res.body.error.message).toMatch(/Capacity cannot be lower/);
  });
});
