import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../infrastructure/auth.ts';
import { UnauthorizedException } from '../domain/errors.ts';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    jti: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedException('يجب تسجيل الدخول وتقديم رمز وصول صالح (Bearer Token).'));
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    next(new UnauthorizedException('رمز الوصول مفقود.'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.sub,
      username: payload.unique_name,
      jti: payload.jti,
    };
    next();
  } catch {
    next(new UnauthorizedException('انتهت صلاحية الجلسة أو أن رمز الوصول غير صالح.'));
  }
}
