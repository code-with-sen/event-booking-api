import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db/pool';

export const app = createApp();

export async function resetDb() {
  await pool.query('TRUNCATE bookings, events, users RESTART IDENTITY CASCADE');
}

let userCounter = 0;

export async function createUser(overrides: { email?: string; name?: string } = {}) {
  userCounter += 1;
  const body = {
    email: overrides.email ?? `user${userCounter}@example.com`,
    name: overrides.name ?? `User ${userCounter}`,
    password: 'password123',
  };
  const res = await request(app).post('/api/v1/auth/register').send(body).expect(201);
  return { user: res.body.user as { id: number; email: string }, token: res.body.token as string };
}

export const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

export async function createEvent(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/v1/events')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'TypeScript Meetup', venue: 'Bengaluru', startsAt: inDays(7), capacity: 50, ...overrides })
    .expect(201);
  return res.body.event as { id: number; capacity: number; seatsBooked: number };
}
