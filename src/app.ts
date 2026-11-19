import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
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
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

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
