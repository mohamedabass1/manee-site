import { z } from 'zod';
import { ValidationError } from './errors.ts';

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NO_HTML_REGEX = /^[^<>]*$/;
const PHONE_CHARS_REGEX = /^[+\d\s-]+$/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function trimString(val: unknown): unknown {
  return typeof val === 'string' ? val.trim() : val;
}

function emptyToNull(val: unknown): unknown {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  return val;
}

function isValidHttpsUrl(val: string): boolean {
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function countDigits(val: string): number {
  return (val.match(/\d/g) || []).length;
}

function isValidExecutionDate(val: string): boolean {
  if (!DATE_ONLY_REGEX.test(val)) return false;
  const parsed = new Date(`${val}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  const [y, m, d] = val.split('-').map(Number);
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() + 1 !== m ||
    parsed.getUTCDate() !== d
  ) {
    return false;
  }
  const maxDate = new Date();
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 2);
  return parsed <= maxDate;
}

export const optionalSlugSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .max(200, 'الـ Slug يجب ألا يتجاوز 200 حرف.')
    .regex(
      SLUG_REGEX,
      'الـ Slug يجب أن يحتوي على أحرف لاتينية صغيرة وأرقام وشرطات فقط (مثل: roof-waterproofing).'
    )
    .nullable()
);

const shortSafeString = (min: number, max: number, label: string) =>
  z.preprocess(
    trimString,
    z
      .string({ error: `${label} مطلوب.` })
      .min(min, `${label} يجب أن يكون ${min} أحرف على الأقل.`)
      .max(max, `${label} يجب ألا يتجاوز ${max} حرفاً.`)
      .regex(NO_HTML_REGEX, `${label} لا يجوز أن يحتوي على وسوم HTML (< أو >).`)
  );

const optionalShortSafeString = (max: number, label: string) =>
  z.preprocess(
    emptyToNull,
    z
      .string()
      .max(max, `${label} يجب ألا يتجاوز ${max} حرفاً.`)
      .regex(NO_HTML_REGEX, `${label} لا يجوز أن يحتوي على وسوم HTML (< أو >).`)
      .nullable()
  );

export const passwordPolicySchema = z
  .string({ error: 'كلمة المرور مطلوبة.' })
  .min(10, 'كلمة المرور يجب أن تتكون من 10 أحرف على الأقل.')
  .max(128, 'كلمة المرور طويلة جداً.')
  .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف إنجليزي كبير واحد على الأقل.')
  .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف إنجليزي صغير واحد على الأقل.')
  .regex(/\d/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.');

export const loginSchema = z.object({
  username: z.preprocess(trimString, z.string().min(1, 'اسم المستخدم مطلوب.')),
  password: z.string().min(1, 'كلمة المرور مطلوبة.'),
});

export const setupAdminSchema = z.object({
  username: shortSafeString(3, 50, 'اسم المستخدم').refine(
    (v) => /^[a-zA-Z0-9._-]+$/.test(v),
    'اسم المستخدم يقبل أحرفاً إنجليزية وأرقاماً ورموز (._-) فقط.'
  ),
  fullName: optionalShortSafeString(100, 'الاسم الكامل').optional(),
  password: passwordPolicySchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة.'),
  newPassword: passwordPolicySchema,
});

export const categorySchema = z.object({
  name: shortSafeString(2, 100, 'اسم التصنيف'),
  displayOrder: z.coerce.number().int('ترتيب العرض يجب أن يكون رقماً صحيحاً.').default(0),
  isActive: z.boolean().default(true),
});

export const serviceSchema = z.object({
  name: shortSafeString(2, 150, 'اسم الخدمة'),
  slug: optionalSlugSchema.optional().default(null),
  shortDescription: shortSafeString(5, 500, 'الوصف المختصر'),
  description: z.preprocess(
    emptyToNull,
    z.string().max(10000, 'الوصف التفصيلي طويل جداً.').nullable()
  ).optional().default(null),
  displayOrder: z.coerce.number().int('ترتيب العرض يجب أن يكون رقماً صحيحاً.').default(0),
  isActive: z.boolean().default(true),
});

export const materialSchema = z.object({
  name: shortSafeString(2, 150, 'اسم المادة'),
  isActive: z.boolean().default(true),
});

export const projectStatusEnumSchema = z.enum(['Planned', 'InProgress', 'Completed'], {
  error: 'حالة المشروع غير صالحة (المسموح: Planned أو InProgress أو Completed).',
});

export const imageStageEnumSchema = z.enum(['General', 'Before', 'During', 'After'], {
  error: 'مرحلة الصورة غير صالحة (المسموح: General أو Before أو During أو After).',
});

export const messageStatusEnumSchema = z.enum(['New', 'Read', 'Handled'], {
  error: 'حالة الرسالة غير صالحة (المسموح: New أو Read أو Handled).',
});

const uniqueIntArray = (label: string, requireNonEmpty: boolean) =>
  z
    .array(z.coerce.number().int(`${label} يجب أن تحتوي على أرقام صحيحة.`).positive())
    .superRefine((arr, ctx) => {
      if (requireNonEmpty && arr.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `يجب اختيار عنصر واحد على الأقل في ${label}.`,
        });
      }
      if (new Set(arr).size !== arr.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `لا يجوز تكرار العناصر داخل ${label}.`,
        });
      }
    });

export const projectBaseSchema = z.object({
  title: shortSafeString(3, 200, 'عنوان المشروع'),
  slug: optionalSlugSchema.optional().default(null),
  shortDescription: shortSafeString(10, 500, 'الوصف المختصر'),
  description: z.preprocess(
    trimString,
    z
      .string({ error: 'الوصف الكامل للمشروع مطلوب.' })
      .min(20, 'الوصف الكامل للمشروع يجب أن يكون 20 حرفاً على الأقل.')
      .max(20000, 'الوصف الكامل طويل جداً.')
  ),
  categoryId: z.coerce.number().int().positive('يجب اختيار تصنيف صحيح للمشروع.'),
  status: projectStatusEnumSchema,
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  city: optionalShortSafeString(100, 'المدينة').optional().default(null),
  executionDate: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .refine(
          isValidExecutionDate,
          'تاريخ التنفيذ غير صالح أو يتجاوز سنتين من تاريخ اليوم (الصيغة YYYY-MM-DD).'
        )
        .nullable()
    )
    .optional()
    .default(null),
  areaInSquareMeters: z
    .preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z
        .number({ error: 'المساحة يجب أن تكون رقماً صالحاً.' })
        .positive('المساحة يجب أن تكون أكبر من صفر.')
        .max(99999999, 'قيمة المساحة كبيرة جداً.')
        .nullable()
    )
    .optional()
    .default(null),
  durationInDays: z
    .preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z
        .number({ error: 'مدة التنفيذ يجب أن تكون رقماً صحيحاً.' })
        .int('مدة التنفيذ يجب أن تكون رقماً صحيحاً.')
        .positive('مدة التنفيذ يجب أن تكون أكبر من صفر.')
        .max(36500, 'مدة التنفيذ كبيرة جداً.')
        .nullable()
    )
    .optional()
    .default(null),
  clientName: optionalShortSafeString(150, 'اسم العميل').optional().default(null),
  displayOrder: z.coerce.number().int('ترتيب العرض يجب أن يكون رقماً صحيحاً.').default(0),
  serviceIds: uniqueIntArray('قائمة الخدمات', true),
  materialIds: uniqueIntArray('قائمة المواد', false).default([]),
});

export const projectUpdateSchema = projectBaseSchema.extend({
  rowVersion: z.coerce
    .number({ error: 'حقل rowVersion مطلوب للتحقق من التزامن.' })
    .int()
    .positive('قيمة rowVersion غير صالحة.'),
});

export const projectPublishSchema = z.object({
  isPublished: z.boolean({ error: 'حقل حالة النشر مطلوب.' }),
});

export const imageMetaUpdateSchema = z.object({
  altText: optionalShortSafeString(250, 'الوصف البديل').optional().default(null),
  stage: imageStageEnumSchema,
});

export const imageOrderSchema = z.object({
  orderedImageIds: z
    .array(z.coerce.number().int().positive())
    .min(1, 'قائمة ترتيب الصور مطلوبة.')
    .refine((arr) => new Set(arr).size === arr.length, 'لا يجوز تكرار معرّفات الصور في الترتيب.'),
});

export const contactMessageCreateSchema = z.object({
  fullName: shortSafeString(2, 100, 'الاسم الكامل'),
  phone: z.preprocess(
    trimString,
    z
      .string({ error: 'رقم الهاتف مطلوب.' })
      .max(30, 'رقم الهاتف يجب ألا يتجاوز 30 حرفاً.')
      .regex(PHONE_CHARS_REGEX, 'رقم الهاتف يقبل الأرقام وعلامة + والمسافات والشرطات فقط.')
      .refine(
        (v) => {
          const digits = countDigits(v);
          return digits >= 7 && digits <= 20;
        },
        'رقم الهاتف يجب أن يحتوي على ما بين 7 و20 رقماً.'
      )
  ),
  email: z
    .preprocess(
      emptyToNull,
      z
        .string()
        .max(150, 'البريد الإلكتروني يجب ألا يتجاوز 150 حرفاً.')
        .email('صيغة البريد الإلكتروني غير صحيحة.')
        .nullable()
    )
    .optional()
    .default(null),
  subject: optionalShortSafeString(150, 'الموضوع').optional().default(null),
  message: z.preprocess(
    trimString,
    z
      .string({ error: 'نص الرسالة مطلوب.' })
      .min(10, 'نص الرسالة يجب أن يكون 10 أحرف على الأقل.')
      .max(2000, 'نص الرسالة يجب ألا يتجاوز 2000 حرف.')
      .regex(NO_HTML_REGEX, 'نص الرسالة لا يجوز أن يحتوي على وسوم HTML (< أو >).')
  ),
  website: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : ''),
    z.string().optional().default('')
  ),
});

export const messageStatusPatchSchema = z.object({
  status: messageStatusEnumSchema,
});

const optionalPhoneSchema = z
  .preprocess(
    emptyToNull,
    z
      .string()
      .max(30, 'رقم الهاتف يجب ألا يتجاوز 30 حرفاً.')
      .regex(PHONE_CHARS_REGEX, 'صيغة رقم الهاتف غير صحيحة.')
      .refine((v) => {
        const digits = countDigits(v);
        return digits >= 7 && digits <= 20;
      }, 'رقم الهاتف يجب أن يحتوي على ما بين 7 و20 رقماً.')
      .nullable()
  )
  .optional()
  .default(null);

const optionalEmailSchema = z
  .preprocess(
    emptyToNull,
    z
      .string()
      .max(150, 'البريد الإلكتروني يجب ألا يتجاوز 150 حرفاً.')
      .email('صيغة البريد الإلكتروني غير صحيحة.')
      .nullable()
  )
  .optional()
  .default(null);

const optionalHttpsUrlSchema = (label: string) =>
  z
    .preprocess(
      emptyToNull,
      z
        .string()
        .max(300, `${label} يجب ألا يتجاوز 300 حرف.`)
        .refine(isValidHttpsUrl, `${label} يجب أن يكون رابطاً صحيحاً يبدأ بـ https://`)
        .nullable()
    )
    .optional()
    .default(null);

export const siteSettingsUpdateSchema = z.object({
  siteName: shortSafeString(2, 150, 'اسم الموقع'),
  heroTitle: optionalShortSafeString(200, 'العنوان الرئيسي').optional().default(null),
  heroSubtitle: optionalShortSafeString(400, 'العنوان الفرعي').optional().default(null),
  aboutTitle: optionalShortSafeString(200, 'عنوان من نحن').optional().default(null),
  aboutText: z
    .preprocess(emptyToNull, z.string().max(10000, 'نص من نحن طويل جداً.').nullable())
    .optional()
    .default(null),
  phone: optionalPhoneSchema,
  whatsAppNumber: optionalPhoneSchema,
  email: optionalEmailSchema,
  address: optionalShortSafeString(300, 'العنوان').optional().default(null),
  workingHours: optionalShortSafeString(200, 'ساعات العمل').optional().default(null),
  facebookUrl: optionalHttpsUrlSchema('رابط فيسبوك'),
  instagramUrl: optionalHttpsUrlSchema('رابط إنستغرام'),
  xUrl: optionalHttpsUrlSchema('رابط منصة إكس'),
  youTubeUrl: optionalHttpsUrlSchema('رابط يوتيوب'),
  notificationEmail: optionalEmailSchema,
});

export function validateOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : 'general';
    if (!errors[field]) {
      errors[field] = [];
    }
    if (!errors[field].includes(issue.message)) {
      errors[field].push(issue.message);
    }
  }
  throw new ValidationError(errors);
}

export function parsePositiveIntParam(raw: string, label: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new ValidationError({ id: [`معرّف ${label} غير صالح.`] });
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new ValidationError({ id: [`معرّف ${label} غير صالح.`] });
  }
  return n;
}
