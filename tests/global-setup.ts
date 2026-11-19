import path from 'path';
import { runner } from 'node-pg-migrate';

// Bring the test database schema up to date once before the whole suite runs.
export default async function globalSetup() {
  const databaseUrl =
    process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/event_booking_test';

  await runner({
    databaseUrl,
    dir: path.join(__dirname, '..', 'migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: () => undefined,
  });
}
