import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginSchema, registerSchema } from './auth.schemas';
import * as authService from './auth.service';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await authService.register(req.body));
  }),
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    res.json(await authService.login(req.body));
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await authService.getById(currentUser(req).id) });
  }),
);
