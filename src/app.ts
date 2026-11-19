import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
