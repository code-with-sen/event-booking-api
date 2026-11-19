import request from 'supertest';
import { pool } from '../src/db/pool';
import { app, createUser, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => pool.end());

describe('POST /api/v1/auth/register', () => {
  it('creates a user and returns a token without exposing the password hash', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'Animesh@Example.com', name: 'Animesh', password: 'password123' })
      .expect(201);

    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'animesh@example.com', name: 'Animesh' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('rejects invalid input with field-level errors', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', name: '', password: 'short' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['body.email', 'body.name', 'body.password']));
  });

  it('rejects a duplicate email regardless of case', async () => {
    await createUser({ email: 'dup@example.com' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'DUP@example.com', name: 'Dup', password: 'password123' })
      .expect(409);
    expect(res.body.error.message).toMatch(/already exists/);
  });

  it('returns 400 for malformed JSON', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await createUser({ email: 'login@example.com' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('uses the same error for wrong password and unknown email', async () => {
    await createUser({ email: 'login@example.com' });
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'wrong-password' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: 'password123' })
      .expect(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const { token, user } = await createUser();
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rejects missing and invalid tokens', async () => {
    await request(app).get('/api/v1/auth/me').expect(401);
    await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not.a.jwt').expect(401);
  });
});
