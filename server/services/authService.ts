import crypto from 'crypto';
import { config } from '../config.ts';
import { getDb } from '../infrastructure/db.ts';
import { hashPassword, issueAccessToken, verifyPassword } from '../infrastructure/auth.ts';
import {
  ConflictException,
  LockedException,
  UnauthorizedException,
} from '../domain/errors.ts';
import {
  bootstrapAdminSchema,
  changePasswordSchema,
  loginSchema,
  validateOrThrow,
} from '../validation/schemas.ts';

interface AdminUserRow {
  Id: string;
  Username: string;
  FullName: string | null;
  PasswordHash: string;
  FailedLoginAttempts: number;
  LockoutEndUtc: string | null;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const authService = {
  getSetupStatus(): { needsSetup: boolean; envPasswordConfigured: boolean } {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) AS cnt FROM AdminUsers').get() as { cnt: number };
    const envPasswordConfigured = config.adminSeed.password.length > 0;
    return {
      needsSetup: !envPasswordConfigured && row.cnt === 0,
      envPasswordConfigured,
    };
  },

  bootstrapAdmin(input: unknown): { accessToken: string; expiresAtUtc: string } {
    if (config.adminSeed.password.length > 0) {
      throw new ConflictException('حساب المدير مُعدّ مسبقاً عبر إعدادات البيئة.');
    }

    const dto = validateOrThrow(bootstrapAdminSchema, input);
    const db = getDb();

    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(dto.password);

    const txn = db.transaction(() => {
      const existing = db.prepare('SELECT COUNT(*) AS cnt FROM AdminUsers').get() as { cnt: number };
      if (existing.cnt > 0) {
        throw new ConflictException('تم إنشاء حساب المدير مسبقاً ولا يمكن إعادة الإعداد.');
      }

      db.prepare(
        `INSERT INTO AdminUsers (Id, Username, FullName, PasswordHash, FailedLoginAttempts, LockoutEndUtc, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, 0, NULL, ?, ?)`,
      ).run(userId, dto.username.toLowerCase(), dto.fullName, passwordHash, now, now);
    });

    txn();
    return issueAccessToken(userId, dto.username.toLowerCase());
  },

  login(input: unknown): { accessToken: string; expiresAtUtc: string } {
    const dto = validateOrThrow(loginSchema, input);
    const db = getDb();

    const user = db
      .prepare(
        `SELECT Id, Username, FullName, PasswordHash, FailedLoginAttempts, LockoutEndUtc
         FROM AdminUsers WHERE Username = ? COLLATE NOCASE`,
      )
      .get(dto.username) as AdminUserRow | undefined;

    if (!user) {
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    const nowMs = Date.now();
    if (user.LockoutEndUtc) {
      const lockoutMs = Date.parse(user.LockoutEndUtc);
      if (!Number.isNaN(lockoutMs) && lockoutMs > nowMs) {
        const remainingMinutes = Math.max(1, Math.ceil((lockoutMs - nowMs) / 60_000));
        throw new LockedException(
          `تم قفل الحساب مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد ${remainingMinutes} دقيقة.`,
        );
      }
    }

    const valid = verifyPassword(dto.password, user.PasswordHash);
    if (!valid) {
      const nextAttempts = user.FailedLoginAttempts + 1;
      const nowIso = new Date().toISOString();
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockoutEnd = new Date(nowMs + LOCKOUT_MINUTES * 60_000).toISOString();
        db.prepare(
          `UPDATE AdminUsers SET FailedLoginAttempts = ?, LockoutEndUtc = ?, UpdatedAt = ? WHERE Id = ?`,
        ).run(nextAttempts, lockoutEnd, nowIso, user.Id);
        throw new LockedException(
          `تم قفل الحساب لمدة ${LOCKOUT_MINUTES} دقيقة بعد ${MAX_FAILED_ATTEMPTS} محاولات دخول فاشلة.`,
        );
      }

      db.prepare(
        `UPDATE AdminUsers SET FailedLoginAttempts = ?, UpdatedAt = ? WHERE Id = ?`,
      ).run(nextAttempts, nowIso, user.Id);

      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    db.prepare(
      `UPDATE AdminUsers SET FailedLoginAttempts = 0, LockoutEndUtc = NULL, UpdatedAt = ? WHERE Id = ?`,
    ).run(new Date().toISOString(), user.Id);

    return issueAccessToken(user.Id, user.Username);
  },

  changePassword(userId: string, input: unknown): void {
    const dto = validateOrThrow(changePasswordSchema, input);
    const db = getDb();

    const user = db
      .prepare(`SELECT Id, PasswordHash FROM AdminUsers WHERE Id = ?`)
      .get(userId) as { Id: string; PasswordHash: string } | undefined;

    if (!user) {
      throw new UnauthorizedException('الحساب غير موجود أو انتهت الجلسة.');
    }

    if (!verifyPassword(dto.currentPassword, user.PasswordHash)) {
      throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة.');
    }

    const newHash = hashPassword(dto.newPassword);
    db.prepare(`UPDATE AdminUsers SET PasswordHash = ?, UpdatedAt = ? WHERE Id = ?`).run(
      newHash,
      new Date().toISOString(),
      user.Id,
    );
  },

  getMe(userId: string): { username: string; fullName: string | null } {
    const db = getDb();
    const user = db
      .prepare(`SELECT Username, FullName FROM AdminUsers WHERE Id = ?`)
      .get(userId) as { Username: string; FullName: string | null } | undefined;

    if (!user) {
      throw new UnauthorizedException('الجلسة غير صالحة.');
    }

    return {
      username: user.Username,
      fullName: user.FullName,
    };
  },
};
