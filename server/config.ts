import crypto from 'crypto';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

const rawJwtSecret = process.env.JWT_SECRET?.trim() || '';
if (isProduction && Buffer.byteLength(rawJwtSecret, 'utf8') < 32) {
  throw new Error('يجب ضبط JWT_SECRET بقيمة آمنة لا تقل عن 32 بايت في بيئة الإنتاج.');
}

// Keep ephemeral 32-byte fallback strictly in memory when JWT_SECRET is not configured in preview/dev
const jwtSecret =
  Buffer.byteLength(rawJwtSecret, 'utf8') >= 32
    ? rawJwtSecret
    : crypto.randomBytes(32).toString('hex');

const adminUsername = process.env.ADMIN_USERNAME?.trim() || '';
const adminPassword = process.env.ADMIN_PASSWORD?.trim() || '';
if (isProduction) {
  if (!adminUsername || !adminPassword) {
    throw new Error('يجب ضبط ADMIN_USERNAME وADMIN_PASSWORD قبل تشغيل بيئة الإنتاج.');
  }
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(adminUsername)) {
    throw new Error('يجب أن يتكون ADMIN_USERNAME من 3 إلى 50 حرفاً لاتينياً أو رقماً أو . _ -.');
  }
  if (
    adminPassword.length < 10 ||
    adminPassword.length > 128 ||
    !/[A-Z]/.test(adminPassword) ||
    !/[a-z]/.test(adminPassword) ||
    !/\d/.test(adminPassword)
  ) {
    throw new Error('يجب أن تحقق ADMIN_PASSWORD سياسة كلمة المرور المعتمدة قبل تشغيل الإنتاج.');
  }
}

const appUrl = process.env.APP_URL?.trim() || 'http://localhost:3000';
if (isProduction) {
  let parsedAppUrl: URL;
  try {
    parsedAppUrl = new URL(appUrl);
  } catch {
    throw new Error('يجب ضبط APP_URL كرابط عام صالح في بيئة الإنتاج.');
  }
  if (parsedAppUrl.protocol !== 'https:') {
    throw new Error('يجب أن يبدأ APP_URL بـ https:// في بيئة الإنتاج.');
  }
}

const storageRootPath = path.resolve(
  process.cwd(),
  process.env.STORAGE_ROOT_PATH?.trim() || './data/uploads',
);

const dbFilePath = path.resolve(
  process.cwd(),
  process.env.DB_PATH?.trim() || './data/manee_portfolio.db',
);

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction,
  appUrl,
  dbFilePath,
  jwt: {
    issuer: process.env.JWT_ISSUER?.trim() || 'InsulationPortfolio',
    audience: process.env.JWT_AUDIENCE?.trim() || 'InsulationPortfolio.Admin',
    secret: jwtSecret,
    expiryMinutes: Math.max(15, Number(process.env.JWT_EXPIRY_MINUTES) || 480),
    clockToleranceSeconds: 60,
  },
  adminSeed: {
    username: (adminUsername || 'admin').toLowerCase(),
    password: adminPassword,
    fullName: process.env.ADMIN_FULL_NAME?.trim() || 'مدير منصة مَنيع',
  },
  storage: {
    rootPath: storageRootPath,
    maxFileSizeMb: Number(process.env.STORAGE_MAX_FILE_SIZE_MB) || 8,
    maxImagesPerProject: Number(process.env.STORAGE_MAX_IMAGES_PER_PROJECT) || 40,
    maxFilesPerRequest: 10,
  },
  email: {
    host: process.env.SMTP_HOST?.trim() || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER?.trim() || '',
    pass: process.env.SMTP_PASS?.trim() || '',
    fromAddress: process.env.SMTP_FROM_ADDRESS?.trim() || '',
    fromName: process.env.SMTP_FROM_NAME?.trim() || 'MANEE | مَنيع',
    useStartTls: process.env.SMTP_USE_STARTTLS !== 'false',
  },
  cors: {
    allowedOrigins,
  },
  swaggerEnabled:
    !isProduction || process.env.SWAGGER_ENABLED?.toLowerCase() === 'true',
} as const;
