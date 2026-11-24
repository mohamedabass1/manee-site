export class AppException extends Error {
  public readonly status: number;
  public readonly title: string;
  public readonly type: string;
  public readonly errors?: Record<string, string[]>;

  constructor(
    status: number,
    title: string,
    detail: string,
    type = 'about:blank',
    errors?: Record<string, string[]>,
  ) {
    super(detail);
    this.status = status;
    this.title = title;
    this.type = type;
    this.errors = errors;
  }
}

export class ValidationException extends AppException {
  constructor(errors: Record<string, string[]>, detail = 'يرجى تصحيح أخطاء التحقق في البيانات المدخلة.') {
    super(
      400,
      'خطأ في التحقق من البيانات',
      detail,
      'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      errors,
    );
  }
}

export class BadRequestException extends AppException {
  constructor(detail: string) {
    super(400, 'طلب غير صالح', detail, 'https://tools.ietf.org/html/rfc7231#section-6.5.1');
  }
}

export class UnauthorizedException extends AppException {
  constructor(detail = 'غير مصرح بالوصول. يرجى تسجيل الدخول أولاً.') {
    super(401, 'غير مصرح', detail, 'https://tools.ietf.org/html/rfc7235#section-3.1');
  }
}

export class NotFoundException extends AppException {
  constructor(detail: string) {
    super(404, 'العنصر غير موجود', detail, 'https://tools.ietf.org/html/rfc7231#section-6.5.4');
  }
}

export class ConflictException extends AppException {
  constructor(detail: string) {
    super(409, 'تعارض في البيانات', detail, 'https://tools.ietf.org/html/rfc7231#section-6.5.8');
  }
}

export class LockedException extends AppException {
  constructor(detail: string) {
    super(423, 'الحساب مقفل مؤقتاً', detail, 'https://tools.ietf.org/html/rfc4918#section-11.3');
  }
}

export class TooManyRequestsException extends AppException {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, detail = 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.') {
    super(429, 'طلبات كثيرة جداً', detail, 'https://tools.ietf.org/html/rfc6585#section-4');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
