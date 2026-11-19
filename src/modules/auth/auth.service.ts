import bcrypt from 'bcryptjs';
import { pool } from '../../db/pool';
import { notFound, unauthorized } from '../../lib/errors';
import { signToken } from '../../middleware/auth';
import type { LoginInput, RegisterInput } from './auth.schemas';

const BCRYPT_ROUNDS = 10;

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
}

const USER_COLUMNS = 'id::int AS id, email, name, created_at AS "createdAt"';

export async function register(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const { rows } = await pool.query<PublicUser>(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING ${USER_COLUMNS}`,
    [input.email, input.name, passwordHash],
  );
  const user = rows[0];
  return { user, token: signToken(user) };
}

export async function login(input: LoginInput) {
  const { rows } = await pool.query<PublicUser & { passwordHash: string }>(
    `SELECT ${USER_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE email = $1`,
    [input.email],
  );
  const row = rows[0];

  // Same error for unknown email and wrong password, so we don't reveal which accounts exist.
  if (!row || !(await bcrypt.compare(input.password, row.passwordHash))) {
    throw unauthorized('Invalid email or password');
  }

  const { passwordHash: _passwordHash, ...user } = row;
  return { user, token: signToken(user) };
}

export async function getById(id: number): Promise<PublicUser> {
  const { rows } = await pool.query<PublicUser>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  if (!rows[0]) throw notFound('User');
  return rows[0];
}
