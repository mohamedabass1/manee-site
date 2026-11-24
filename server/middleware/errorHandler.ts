import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { config } from '../config.ts';
import { AppException, TooManyRequestsException } from '../domain/errors.ts';

export function attachTraceId(req: Request, res: Response, next: NextFunction): void {
  const traceId = crypto.randomUUID();
  (req as any).traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  next();
}

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const traceId: string = (req as any).traceId || crypto.randomUUID();

  if (err instanceof multer.MulterError) {
    let detail = 'حدث خطأ أثناء رفع الملفات.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      detail = `حجم أحد الملفات يتجاوز الحد الأقصى المسموح (${config.storage.maxFileSizeMb} ميجابايت).`;
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      detail = `الحد الأقصى لعدد الصور في الطلب الواحد هو ${config.storage.maxFilesPerRequest} صور.`;
    }
    res.status(400).type('application/problem+json').json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'خطأ في رفع الملفات',
      status: 400,
      detail,
      traceId,
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).type('application/problem+json').json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'صيغة JSON غير صالحة',
      status: 400,
      detail: 'تعذّر قراءة جسم الطلب بصيغة JSON صحيحة.',
      traceId,
    });
    return;
  }

  if (err instanceof AppException) {
    if (err instanceof TooManyRequestsException) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds));
    }
    const body: Record<string, unknown> = {
      type: err.type,
      title: err.title,
      status: err.status,
      detail: err.message,
      traceId,
    };
    if (err.errors) {
      body.errors = err.errors;
    }
    res.status(err.status).type('application/problem+json').json(body);
    return;
  }

  // Unexpected internal error: log safely without secrets, hide stack trace in production
  console.error(`[Error ${traceId}]`, err instanceof Error ? err.message : String(err));

  const body: Record<string, unknown> = {
    type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
    title: 'خطأ داخلي في الخادم',
    status: 500,
    detail: 'حدث خطأ غير متوقع أثناء معالجة الطلب. يرجى المحاولة لاحقاً.',
    traceId,
  };

  if (!config.isProduction && err instanceof Error) {
    body.devMessage = err.message;
  }

  res.status(500).type('application/problem+json').json(body);
}
