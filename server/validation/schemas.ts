import { z } from 'zod';
import { ImageStage, MessageStatus, ProjectStatus } from '../domain/types.ts';
import { ValidationException } from '../domain/errors.ts';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTML_TAG_REGEX = /[<>]/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function noHtml(fieldLabel: string) {
  return (val: string) => !HTML_TAG_REGEX.test(val);
}

const cleanRequiredString = (label: string, min: number, max: number, allowHtmlChars = false) => {
  let schema = z
    .string({ message: `${label} مطلوب.` })
    .trim()
    .min(min, { message: `${label} يجب أن لا يقل عن ${min} أحرف.` })
    .max(max, { message: `${label} يجب أن لا يتجاوز ${max} حرفاً.` });
  if (!allowHtmlChars) {
    schema = schema.refine(noHtml(label), {
      message: `${label} لا يجوز أن يحتوي على وسوم أو رموز HTML (< أو >).`,
    });
  }
  return schema;
};

const cleanOptionalString = (label: string, max: number, allowHtmlChars = false) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const trimmed = v.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .refine((v) => v === null || v.length <= max, {
      message: `${label} يجب أن لا يتجاوز ${max} حرفاً.`,
    })
    .refine((v) => v === null || allowHtmlChars || !HTML_TAG_REGEX.test(v), {
      message: `${label} لا يجوز أن يحتوي على وسوم HTML (< أو >).`,
    });

const optionalSlugSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine((v) => v === null || v.length <= 200, {
    message: 'الرابط المختصر (Slug) يجب أن لا يتجاوز 200 حرف.',
  })
  .refine((v) => v === null || SLUG_REGEX.test(v), {
    message: 'الرابط المختصر (Slug) يجب أن يحتوي على أحرف لاتينية صغيرة وأرقام وشرطات فقط (مثال: roof-insulation).',
  });

const phoneFormatValidator = (val: string) => {
  if (!/^[+\d\s-]+$/.test(val)) return false;
  const digitsCount = (val.match(/\d/g) || []).length;
  return digitsCount >= 7 && digitsCount <= 20;
};

const optionalPhoneSchema = cleanOptionalString('رقم الهاتف', 30).refine(
  (v) => v === null || phoneFormatValidator(v),
  { message: 'صيغة رقم الهاتف غير صحيحة (يجب أن يحتوي بين 7 و20 رقماً).' },
);

const optionalEmailSchema = cleanOptionalString('البريد الإلكتروني', 150).refine(
  (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  { message: 'صيغة البريد الإلكتروني غير صحيحة.' },
);

const optionalHttpsUrlSchema = (label: string) =>
  cleanOptionalString(label, 300).refine(
    (v) => {
      if (v === null) return true;
      try {
        const parsed = new URL(v);
        return parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: `${label} يجب أن يكون رابطاً مطلقاً صحيحاً يبدأ بـ https://` },
  );

export const passwordPolicySchema = z
  .string({ message: 'كلمة المرور مطلوبة.' })
  .min(10, { message: 'كلمة المرور يجب أن لا تقل عن 10 أحرف.' })
  .max(128, { message: 'كلمة المرور طويلة جداً.' })
  .refine((v) => /[A-Z]/.test(v), {
    message: 'كلمة المرور يجب أن تحتوي على حرف إنجليزي كبير واحد على الأقل.',
  })
  .refine((v) => /[a-z]/.test(v), {
    message: 'كلمة المرور يجب أن تحتوي على حرف إنجليزي صغير واحد على الأقل.',
  })
  .refine((v) => /\d/.test(v), {
    message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.',
  });

export const loginSchema = z.object({
  username: cleanRequiredString('اسم المستخدم', 2, 100),
  password: z.string({ message: 'كلمة المرور مطلوبة.' }).min(1, { message: 'كلمة المرور مطلوبة.' }),
});

export const bootstrapAdminSchema = z.object({
  username: cleanRequiredString('اسم المستخدم', 3, 50).refine(
    (v) => /^[a-zA-Z0-9._-]+$/.test(v),
    { message: 'اسم المستخدم يجب أن يتكون من أحرف لاتينية وأرقام فقط.' },
  ),
  fullName: cleanRequiredString('الاسم الكامل', 2, 100),
  password: passwordPolicySchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ message: 'كلمة المرور الحالية مطلوبة.' })
    .min(1, { message: 'كلمة المرور الحالية مطلوبة.' }),
  newPassword: passwordPolicySchema,
});

export const categorySchema = z.object({
  name: cleanRequiredString('اسم التصنيف', 2, 100),
  displayOrder: z.number({ message: 'ترتيب العرض يجب أن يكون رقماً.' }).int().default(0),
  isActive: z.boolean().default(true),
});

export const serviceSchema = z.object({
  name: cleanRequiredString('اسم الخدمة', 2, 150),
  slug: optionalSlugSchema,
  shortDescription: cleanRequiredString('الوصف المختصر', 10, 500),
  description: cleanOptionalString('الوصف التفصيلي', 10000, true),
  displayOrder: z.number({ message: 'ترتيب العرض يجب أن يكون رقماً.' }).int().default(0),
  isActive: z.boolean().default(true),
});

export const materialSchema = z.object({
  name: cleanRequiredString('اسم المادة', 2, 150),
  isActive: z.boolean().default(true),
});

const executionDateSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine(
    (v) => {
      if (v === null) return true;
      if (!DATE_ONLY_REGEX.test(v)) return false;
      const d = new Date(`${v}T00:00:00Z`);
      return !Number.isNaN(d.getTime());
    },
    { message: 'تاريخ التنفيذ يجب أن يكون بصيغة صحيحة (YYYY-MM-DD).' },
  )
  .refine(
    (v) => {
      if (v === null) return true;
      const d = new Date(`${v}T00:00:00Z`);
      const maxDate = new Date();
      maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 2);
      return d.getTime() <= maxDate.getTime();
    },
    { message: 'تاريخ التنفيذ لا يمكن أن يتجاوز سنتين من تاريخ اليوم.' },
  );

const positiveIdArray = (label: string, requiredNonEmpty: boolean) => {
  const base = z
    .array(z.number().int().positive({ message: `معرّف غير صالح في ${label}.` }), {
      message: `${label} يجب أن تكون مصفوفة.`,
    })
    .refine((arr) => new Set(arr).size === arr.length, {
      message: `لا يُسمح بتكرار العناصر داخل ${label}.`,
    });
  return requiredNonEmpty
    ? base.min(1, { message: `يجب اختيار عنصر واحد على الأقل في ${label}.` })
    : base;
};

export const createProjectSchema = z.object({
  title: cleanRequiredString('عنوان المشروع', 3, 200),
  slug: optionalSlugSchema,
  shortDescription: cleanRequiredString('الوصف المختصر للمشروع', 10, 500),
  description: cleanRequiredString('الوصف التفصيلي للمشروع', 20, 20000, true),
  categoryId: z.number({ message: 'التصنيف مطلوب.' }).int().positive({ message: 'التصنيف غير صالح.' }),
  status: z.nativeEnum(ProjectStatus, { message: 'حالة المشروع غير صالحة.' }),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  city: cleanOptionalString('المدينة', 100),
  executionDate: executionDateSchema,
  areaInSquareMeters: z
    .union([z.number(), z.null(), z.undefined()])
    .transform((v) => (v === undefined ? null : v))
    .refine((v) => v === null || v > 0, {
      message: 'المساحة بالمتر المربع يجب أن تكون أكبر من صفر.',
    }),
  durationInDays: z
    .union([z.number(), z.null(), z.undefined()])
    .transform((v) => (v === undefined ? null : v))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0), {
      message: 'مدة التنفيذ بالأيام يجب أن تكون عدداً صحيحاً أكبر من صفر.',
    }),
  clientName: cleanOptionalString('اسم العميل', 150),
  displayOrder: z.number().int().default(0),
  serviceIds: positiveIdArray('قائمة الخدمات', true),
  materialIds: positiveIdArray('قائمة المواد', false).default([]),
});

export const updateProjectSchema = createProjectSchema.extend({
  rowVersion: z.number({ message: 'رمز التزامن (rowVersion) مطلوب عند التعديل.' }).int().positive(),
});

export const publishProjectSchema = z.object({
  isPublished: z.boolean({ message: 'قيمة حالة النشر (isPublished) مطلوبة.' }),
});

export const updateImageMetadataSchema = z.object({
  altText: cleanOptionalString('الوصف البديل للصورة', 250),
  stage: z.nativeEnum(ImageStage, { message: 'مرحلة التنفيذ غير صالحة.' }),
});

export const reorderImagesSchema = z.object({
  orderedImageIds: z
    .array(z.number().int().positive(), { message: 'قائمة ترتيب الصور غير صالحة.' })
    .min(1, { message: 'قائمة ترتيب الصور لا يمكن أن تكون فارغة.' }),
});

export const createContactMessageSchema = z.object({
  fullName: cleanRequiredString('الاسم الكامل', 2, 100),
  phone: cleanRequiredString('رقم الهاتف', 7, 30).refine(phoneFormatValidator, {
    message: 'رقم الهاتف يجب أن يتكون من 7 إلى 20 رقماً (يُسمح بـ + والمسافات والشرطات).',
  }),
  email: optionalEmailSchema,
  subject: cleanOptionalString('الموضوع', 150),
  message: cleanRequiredString('نص الرسالة', 10, 2000, true),
  website: z.union([z.string(), z.null(), z.undefined()]).optional(),
});

export const updateMessageStatusSchema = z.object({
  status: z.nativeEnum(MessageStatus, { message: 'حالة الرسالة غير صالحة.' }),
});

export const updateSiteSettingsSchema = z.object({
  siteName: cleanRequiredString('اسم الموقع', 2, 150),
  heroTitle: cleanOptionalString('العنوان الرئيسي', 200),
  heroSubtitle: cleanOptionalString('العنوان الفرعي', 400),
  aboutTitle: cleanOptionalString('عنوان من نحن', 200),
  aboutText: cleanOptionalString('نص من نحن', 10000, true),
  phone: optionalPhoneSchema,
  whatsAppNumber: optionalPhoneSchema,
  email: optionalEmailSchema,
  address: cleanOptionalString('العنوان', 300),
  workingHours: cleanOptionalString('ساعات العمل', 200),
  facebookUrl: optionalHttpsUrlSchema('رابط فيسبوك'),
  instagramUrl: optionalHttpsUrlSchema('رابط إنستغرام'),
  xUrl: optionalHttpsUrlSchema('رابط إكس'),
  youtubeUrl: optionalHttpsUrlSchema('رابط يوتيوب'),
  notificationEmail: optionalEmailSchema,
});

export function validateOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : 'general';
      if (!errors[key]) errors[key] = [];
      errors[key].push(issue.message);
    }
    throw new ValidationException(errors);
  }
  return result.data;
}
