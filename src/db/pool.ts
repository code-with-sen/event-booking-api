import net from 'node:net';
import { Pool, PoolClient } from 'pg';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Node tries each of the database host's addresses (IPv6 and IPv4) for only 250 ms by default.
// On a small, CPU-starved instance opening several connections at once, that is too short and
// connects fail with ETIMEDOUT. Give each address attempt more time.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  // Fail a request cleanly if no connection is available in time, instead of hanging.
  connectionTimeoutMillis: 10_000,
  // Keep idle connections around longer so bursts reuse them rather than opening new ones.
  idleTimeoutMillis: 60_000,
  keepAlive: true,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected Postgres pool error');
});

/**
 * Runs `fn` inside a transaction. Commits on success, rolls back on any thrown error,
 * and always releases the client back to the pool.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
