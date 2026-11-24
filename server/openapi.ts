import { Router } from 'express';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'MANEE | مَنيع — Insulation Portfolio API v1',
    version: '1.0.0',
    description:
      'واجهة برمجية كاملة (Public & Admin) لمنصة معرض أعمال مقاول العزل MANEE | مَنيع، مطابقة لوثيقة الـ SOP مع أخطاء RFC 7807 ProblemDetails بالعربية.',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  tags: [
    { name: 'Public', description: 'مسارات الواجهة العامة بلا مصادقة' },
    { name: 'Auth', description: 'مصادقة الأدمن وإدارة كلمة المرور' },
    { name: 'Admin', description: 'مسارات لوحة التحكم (تتطلب Bearer JWT)' },
  ],
  paths: {
    '/public/site-settings': { get: { tags: ['Public'], summary: 'إعدادات الموقع العامة (بدون NotificationEmail)' } },
    '/public/services': { get: { tags: ['Public'], summary: 'قائمة الخدمات الفعّالة' } },
    '/public/services/{id}': { get: { tags: ['Public'], summary: 'تفاصيل خدمة فعّالة' } },
    '/public/categories': { get: { tags: ['Public'], summary: 'قائمة التصنيفات الفعّالة' } },
    '/public/materials': { get: { tags: ['Public'], summary: 'قائمة المواد الفعّالة' } },
    '/public/projects': { get: { tags: ['Public'], summary: 'المشاريع المنشورة مع ترقيم وفلاتر' } },
    '/public/projects/{id}': { get: { tags: ['Public'], summary: 'تفاصيل مشروع منشور (بدون clientName)' } },
    '/public/contact-messages': { post: { tags: ['Public'], summary: 'إرسال استفسار عميل (Honeypot + Rate Limit)' } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'تسجيل دخول الأدمن والحصول على JWT' } },
    '/auth/me': { get: { tags: ['Auth'], security: [{ BearerAuth: [] }], summary: 'التحقق من الجلسة الحالية' } },
    '/auth/change-password': { post: { tags: ['Auth'], security: [{ BearerAuth: [] }], summary: 'تغيير كلمة مرور الأدمن' } },
    '/admin/projects': {
      get: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'كل المشاريع غير المحذوفة' },
      post: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'إنشاء مشروع جديد' },
    },
    '/admin/projects/{id}': {
      get: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'تفاصيل المشروع الكاملة' },
      put: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'تعديل المشروع مع فحص RowVersion' },
      delete: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'حذف ناعم للمشروع (Soft Delete)' },
    },
    '/admin/projects/{id}/publish': {
      patch: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'تبديل حالة النشر' },
    },
    '/admin/projects/{projectId}/images': {
      post: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'رفع حتى 10 صور ومعالجتها عبر Sharp' },
    },
    '/admin/projects/{projectId}/images/{imageId}': {
      put: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'تعديل altText وstage' },
      delete: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'حذف صورة مع إعادة تعيين الغلاف تلقائياً' },
    },
    '/admin/projects/{projectId}/images/{imageId}/file': {
      put: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'استبدال ملف الصورة' },
    },
    '/admin/projects/{projectId}/images/{imageId}/cover': {
      put: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'تعيين صورة الغلاف ضمن معاملة واحدة' },
    },
    '/admin/projects/{projectId}/images/order': {
      put: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'إعادة ترتيب جميع صور المشروع' },
    },
    '/admin/categories': { get: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'إدارة التصنيفات' }, post: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'إنشاء تصنيف' } },
    '/admin/services': { get: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'إدارة الخدمات' }, post: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'إنشاء خدمة' } },
    '/admin/materials': { get: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'إدارة المواد' }, post: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'إنشاء مادة' } },
    '/admin/contact-messages': { get: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'صندوق رسائل العملاء' } },
    '/admin/contact-messages/unread-count': { get: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'عدد الرسائل الجديدة' } },
    '/admin/contact-messages/{id}/status': { patch: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'تحديث حالة الرسالة' } },
    '/admin/site-settings': {
      get: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'قراءة إعدادات الموقع الكاملة' },
      put: { tags: ['Admin'], security: [{ BearerAuth: [] }], summary: 'تحديث إعدادات الموقع' },
    },
  },
};

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

docsRouter.get('/docs', (_req, res) => {
  const rows = Object.entries(openApiSpec.paths)
    .flatMap(([pathStr, methods]) =>
      Object.entries(methods as Record<string, any>).map(([method, meta]) => {
        const tag = meta.tags?.[0] || 'API';
        const auth = meta.security ? 'Bearer JWT' : 'عام';
        return `<tr>
          <td><span class="m ${method}">${method.toUpperCase()}</span></td>
          <td dir="ltr" class="mono">/api/v1${pathStr}</td>
          <td>${tag}</td>
          <td>${auth}</td>
          <td>${meta.summary || ''}</td>
        </tr>`;
      }),
    )
    .join('');

  res.type('text/html; charset=utf-8').send(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>توثيق الواجهة البرمجية — MANEE | مَنيع</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0E1116; color: #F4F5F6; margin: 0; padding: 32px; line-height: 1.6; }
    .wrap { max-width: 1120px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    .sub { color: #94A3B8; margin-bottom: 24px; }
    .bar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    a.btn { display: inline-block; background: #D97706; color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 14px; }
    a.sec { background: #1E242E; border: 1px solid #2D3542; }
    table { width: 100%; border-collapse: collapse; background: #151921; border: 1px solid #232A35; }
    th, td { text-align: right; padding: 10px 14px; border-bottom: 1px solid #232A35; font-size: 14px; }
    th { background: #1A2029; color: #CBD5E1; font-weight: 600; }
    .mono { font-family: ui-monospace, monospace; font-size: 13px; color: #E2E8F0; text-align: left; }
    .m { display: inline-block; font-family: ui-monospace, monospace; font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 4px; }
    .get { background: #0369A1; color: #fff; }
    .post { background: #15803D; color: #fff; }
    .put { background: #B45309; color: #fff; }
    .patch { background: #7C3AED; color: #fff; }
    .delete { background: #B91C1C; color: #fff; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>MANEE | مَنيع — توثيق الواجهة البرمجية (OpenAPI v1)</h1>
    <p class="sub">كافة المسارات المعتمدة في وثيقة الـ SOP بنمط camelCase وأخطاء RFC 7807 ProblemDetails بالعربية.</p>
    <div class="bar">
      <a class="btn" href="/">العودة للموقع</a>
      <a class="btn sec" href="/admin">لوحة التحكم</a>
      <a class="btn sec" href="/api/openapi.json" target="_blank">ملف OpenAPI JSON</a>
      <a class="btn sec" href="/health" target="_blank">فحص الصحة (/health)</a>
    </div>
    <table>
      <thead>
        <tr>
          <th>الطريقة</th>
          <th>المسار</th>
          <th>المجموعة</th>
          <th>المصادقة</th>
          <th>الوصف</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</body>
</html>`);
});
