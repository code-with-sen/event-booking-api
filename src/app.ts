import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { pool } from './db/pool';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { authRouter } from './modules/auth/auth.routes';
import { bookingsRouter, eventBookingsRouter } from './modules/bookings/bookings.routes';
import { eventsRouter } from './modules/events/events.routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, maxAge: 600 }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  // Landing response so visitors opening the base URL see what the API offers.
  app.get('/', (_req, res) => {
    res.json({
      name: 'event-booking-api',
      description: 'Concurrency-safe event booking REST API (TypeScript, Express, PostgreSQL)',
      source: 'https://github.com/code-with-sen/event-booking-api',
      health: '/health',
      endpoints: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        me: 'GET /api/v1/auth/me',
        listEvents: 'GET /api/v1/events',
        getEvent: 'GET /api/v1/events/:id',
        createEvent: 'POST /api/v1/events',
        bookSeats: 'POST /api/v1/events/:id/bookings',
        myBookings: 'GET /api/v1/bookings/me',
        cancelBooking: 'POST /api/v1/bookings/:id/cancel',
      },
    });
  });

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down' });
    }
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/events/:id/bookings', eventBookingsRouter);
  app.use('/api/v1/events', eventsRouter);
  app.use('/api/v1/bookings', bookingsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
