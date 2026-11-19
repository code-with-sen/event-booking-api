import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { unauthorized } from '../lib/errors';
import type { AuthUser } from '../types/express';

interface TokenPayload {
  sub: string;
  email: string;
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ email: user.email }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized());

  try {
    const payload = jwt.verify(header.slice('Bearer '.length), env.JWT_SECRET) as TokenPayload;
    req.user = { id: Number(payload.sub), email: payload.email };
    return next();
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
};

/** Narrows req.user for handlers mounted behind requireAuth. */
export function currentUser(req: { user?: AuthUser }): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
