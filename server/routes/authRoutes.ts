import { Router } from 'express';
import { authService } from '../services/authService.ts';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.ts';
import { loginRateLimiter } from '../middleware/rateLimit.ts';

export const authRouter = Router();

authRouter.get('/setup-status', (_req, res, next) => {
  try {
    res.json(authService.getSetupStatus());
  } catch (err) {
    next(err);
  }
});

authRouter.post('/bootstrap', loginRateLimiter, (req, res, next) => {
  try {
    const result = authService.bootstrapAdmin(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', loginRateLimiter, (req, res, next) => {
  try {
    const result = authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/change-password', requireAuth, (req: AuthenticatedRequest, res, next) => {
  try {
    authService.changePassword(req.user!.userId, req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(authService.getMe(req.user!.userId));
  } catch (err) {
    next(err);
  }
});
