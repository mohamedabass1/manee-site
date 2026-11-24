import type { NextFunction, Request, Response } from 'express';
import { TooManyRequestsException } from '../domain/errors.ts';

interface WindowBucket {
  count: number;
  resetAtMs: number;
}

export function createIpRateLimiter(options: {
  name: string;
  maxRequests: number;
  windowMs: number;
  message?: string;
}) {
  const buckets = new Map<string, WindowBucket>();

  // Periodic cleanup to avoid unbounded memory growth
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAtMs <= now) {
        buckets.delete(key);
      }
    }
  }, Math.min(options.windowMs, 5 * 60_000));
  cleanupTimer.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${options.name}:${ip}`;
    const now = Date.now();

    const existing = buckets.get(key);
    if (!existing || existing.resetAtMs <= now) {
      buckets.set(key, { count: 1, resetAtMs: now + options.windowMs });
      next();
      return;
    }

    if (existing.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      next(new TooManyRequestsException(retryAfterSeconds, options.message));
      return;
    }

    existing.count += 1;
    next();
  };
}

export const loginRateLimiter = createIpRateLimiter({
  name: 'login',
  maxRequests: 10,
  windowMs: 15 * 60_000,
  message: 'تم تجاوز عدد محاولات تسجيل الدخول المسموحة. يرجى الانتظار ثم المحاولة مجدداً.',
});

export const contactRateLimiter = createIpRateLimiter({
  name: 'contact',
  maxRequests: 5,
  windowMs: 60 * 60_000,
  message: 'تم إرسال عدد كبير من الرسائل خلال الساعة الأخيرة. يرجى المحاولة لاحقاً.',
});

export const publicApiRateLimiter = createIpRateLimiter({
  name: 'public',
  maxRequests: 120,
  windowMs: 60_000,
});

export const adminUploadRateLimiter = createIpRateLimiter({
  name: 'admin_upload',
  maxRequests: 30,
  windowMs: 60_000,
  message: 'تم تجاوز الحد المسموح لرفع الصور في الدقيقة. يرجى الانتظار لحظات.',
});
