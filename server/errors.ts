import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.ts';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  traceId: string;
  errors?: Record<string, string[]>;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly title: string;
  public readonly type: string;
  public readonly errors?: Record<string, string[]>;
  public readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    title: string,
    detail: string,
    options?: {
      type?: string;
      errors?: Record<string, string[]>;
      retryAfterSeconds?: number;
    }
  ) {
    super(detail);
    this.status = status;
    this.title = title;
    this.type = options?.type || `https://httpstatuses.com/${status}`;
    this.errors = options?.errors;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>, detail = 'يرجى التحقق من صحة البيانات المدخلة.') {
    super(400, 'خطأ في التحقق من المدخلات', detail, { errors });
  }
}

export class BadRequestError extends AppError {
  constructor(detail: string) {
    super(400, 'طلب غير صالح', detail);
  }
}

export class UnauthorizedError extends AppError {
  constructor(detail = 'غير مصرح بالوصول. يرجى تسجيل الدخول.') {
    super(401, 'غير مصرح', detail);
  }
}

export class ForbiddenError extends AppError {
  constructor(detail = 'لا تملك الصلاحية لتنفيذ هذا الإجراء.') {
    super(403, 'ممنوع الوصول', detail);
  }
}

export class NotFoundError extends AppError {
  constructor(detail = 'العنصر المطلوب غير موجود.') {
    super(404, 'غير موجود', detail);
  }
}

export class ConflictError extends AppError {
  constructor(detail: string) {
    super(409, 'تعارض في البيانات', detail);
  }
}

export class LockedError extends AppError {
  constructor(detail: string) {
    super(423, 'الحساب مقفل مؤقتاً', detail);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(detail: string, retryAfterSeconds: number) {
    super(429, 'تم تجاوز الحد المسموح للطلبات', detail, { retryAfterSeconds });
  }
}

export function attachTraceId(req: Request, res: Response, next: NextFunction): void {
  const traceId = crypto.randomUUID();
  res.locals.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  next();
}

export function sendProblemDetails(
  req: Request,
  res: Response,
  err: AppError | Error
): void {
  const traceId = (res.locals.traceId as string) || crypto.randomUUID();

  if (err instanceof AppError) {
    if (err.retryAfterSeconds !== undefined) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds));
    }
    const payload: ProblemDetails = {
      type: err.type,
      title: err.title,
      status: err.status,
      detail: err.message,
      instance: req.originalUrl,
      traceId,
    };
    if (err.errors) {
      payload.errors = err.errors;
    }
    res.status(err.status).type('application/problem+json').json(payload);
    return;
  }

  // Handle Multer upload errors cleanly in Arabic
  const anyErr = err as { code?: string; message?: string; status?: number };
  if (anyErr?.code === 'LIMIT_FILE_SIZE') {
    const payload: ProblemDetails = {
      type: 'https://httpstatuses.com/400',
      title: 'تجاوز حجم الملف',
      status: 400,
      detail: `حجم الملف يتجاوز الحد الأقصى المسموح (${config.storage.maxFileSizeMb} ميجابايت).`,
      instance: req.originalUrl,
      traceId,
    };
    res.status(400).type('application/problem+json').json(payload);
    return;
  }

  if (anyErr?.code === 'LIMIT_FILE_COUNT') {
    const payload: ProblemDetails = {
      type: 'https://httpstatuses.com/400',
      title: 'تجاوز عدد الملفات',
      status: 400,
      detail: 'الحد الأقصى للرفع في الطلب الواحد هو 10 صور.',
      instance: req.originalUrl,
      traceId,
    };
    res.status(400).type('application/problem+json').json(payload);
    return;
  }

  if (anyErr?.status === 400 && err instanceof SyntaxError) {
    const payload: ProblemDetails = {
      type: 'https://httpstatuses.com/400',
      title: 'صيغة JSON غير صالحة',
      status: 400,
      detail: 'تعذر قراءة جسم الطلب. يرجى التأكد من صحة صيغة JSON.',
      instance: req.originalUrl,
      traceId,
    };
    res.status(400).type('application/problem+json').json(payload);
    return;
  }

  console.error(`[Error][traceId=${traceId}]`, err.message);

  const payload: ProblemDetails = {
    type: 'https://httpstatuses.com/500',
    title: 'خطأ داخلي في الخادم',
    status: 500,
    detail: config.isProduction
      ? 'حدث خطأ غير متوقع أثناء معالجة الطلب. يرجى المحاولة لاحقاً.'
      : err.message || 'حدث خطأ غير متوقع أثناء معالجة الطلب.',
    instance: req.originalUrl,
    traceId,
  };
  res.status(500).type('application/problem+json').json(payload);
}

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  sendProblemDetails(req, res, err);
}
