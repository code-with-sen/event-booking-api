import request from 'supertest';
import { pool } from '../src/db/pool';
import { app } from './helpers';

afterAll(() => pool.end());

describe('GET /health', () => {
  it('reports the API and database as up', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('describes the API at the root URL', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.body.name).toBe('event-booking-api');
    expect(res.body.endpoints.listEvents).toBe('GET /api/v1/events');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
