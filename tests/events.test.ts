import request from 'supertest';
import { pool } from '../src/db/pool';
import { app, createEvent, createUser, inDays, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => pool.end());

describe('events', () => {
  it('requires authentication to create an event', async () => {
    await request(app)
      .post('/api/v1/events')
      .send({ title: 'Meetup', venue: 'Pune', startsAt: inDays(1), capacity: 10 })
      .expect(401);
  });

  it('creates an event with seat counts', async () => {
    const { token, user } = await createUser();
    const event = await createEvent(token, { capacity: 30 });
    expect(event).toMatchObject({ organizerId: user.id, capacity: 30, seatsBooked: 0, seatsAvailable: 30 });
  });

  it('rejects events in the past and non-positive capacity', async () => {
    const { token } = await createUser();
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Old event', venue: 'Delhi', startsAt: inDays(-1), capacity: 0 })
      .expect(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['body.startsAt', 'body.capacity']));
  });

  it('lists upcoming events with pagination and search', async () => {
    const { token } = await createUser();
    await createEvent(token, { title: 'Node.js Conf', startsAt: inDays(3) });
    await createEvent(token, { title: 'Postgres Day', startsAt: inDays(1) });
    await createEvent(token, { title: 'React Summit', startsAt: inDays(2) });

    const page = await request(app).get('/api/v1/events?limit=2&offset=0').expect(200);
    expect(page.body.pagination).toEqual({ total: 3, limit: 2, offset: 0 });
    expect(page.body.data.map((e: { title: string }) => e.title)).toEqual(['Postgres Day', 'React Summit']);

    const search = await request(app).get('/api/v1/events?q=postgres').expect(200);
    expect(search.body.data).toHaveLength(1);
  });

  it('returns 404 for a missing event and 400 for a non-numeric id', async () => {
    await request(app).get('/api/v1/events/9999').expect(404);
    await request(app).get('/api/v1/events/abc').expect(400);
  });

  it('only lets the organizer update or delete an event', async () => {
    const organizer = await createUser();
    const stranger = await createUser();
    const event = await createEvent(organizer.token);

    await request(app)
      .patch(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ title: 'Hijacked' })
      .expect(403);

    const updated = await request(app)
      .patch(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ title: 'Renamed Meetup' })
      .expect(200);
    expect(updated.body.event.title).toBe('Renamed Meetup');

    await request(app)
      .delete(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .expect(403);
    await request(app)
      .delete(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(204);
    await request(app).get(`/api/v1/events/${event.id}`).expect(404);
  });

  it('rejects an empty update body', async () => {
    const { token } = await createUser();
    const event = await createEvent(token);
    await request(app)
      .patch(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });
});
