import { getDb } from '../infrastructure/db.ts';
import { NotFoundException } from '../domain/errors.ts';
import { updateSiteSettingsSchema, validateOrThrow } from '../validation/schemas.ts';

export interface PublicSiteSettingsDto {
  siteName: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  aboutTitle: string | null;
  aboutText: string | null;
  phone: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  address: string | null;
  workingHours: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
  youtubeUrl: string | null;
  updatedAt: string;
}

export interface AdminSiteSettingsDto extends PublicSiteSettingsDto {
  notificationEmail: string | null;
}

function getRow(): any {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM SiteSettings WHERE Id = 1`).get();
  if (!row) {
    throw new NotFoundException('إعدادات الموقع غير مهيّأة.');
  }
  return row;
}

export const siteSettingsService = {
  getPublicSettings(): PublicSiteSettingsDto {
    const r = getRow();
    // Strictly exclude NotificationEmail from public API
    return {
      siteName: r.SiteName,
      heroTitle: r.HeroTitle,
      heroSubtitle: r.HeroSubtitle,
      aboutTitle: r.AboutTitle,
      aboutText: r.AboutText,
      phone: r.Phone,
      whatsAppNumber: r.WhatsAppNumber,
      email: r.Email,
      address: r.Address,
      workingHours: r.WorkingHours,
      facebookUrl: r.FacebookUrl,
      instagramUrl: r.InstagramUrl,
      xUrl: r.XUrl,
      youtubeUrl: r.YouTubeUrl,
      updatedAt: r.UpdatedAt,
    };
  },

  getAdminSettings(): AdminSiteSettingsDto {
    const r = getRow();
    return {
      ...this.getPublicSettings(),
      notificationEmail: r.NotificationEmail,
    };
  },

  updateAdminSettings(input: unknown): AdminSiteSettingsDto {
    const dto = validateOrThrow(updateSiteSettingsSchema, input);
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE SiteSettings
       SET SiteName = ?, HeroTitle = ?, HeroSubtitle = ?, AboutTitle = ?, AboutText = ?,
           Phone = ?, WhatsAppNumber = ?, Email = ?, Address = ?, WorkingHours = ?,
           FacebookUrl = ?, InstagramUrl = ?, XUrl = ?, YouTubeUrl = ?,
           NotificationEmail = ?, UpdatedAt = ?
       WHERE Id = 1`,
    ).run(
      dto.siteName,
      dto.heroTitle,
      dto.heroSubtitle,
      dto.aboutTitle,
      dto.aboutText,
      dto.phone,
      dto.whatsAppNumber,
      dto.email,
      dto.address,
      dto.workingHours,
      dto.facebookUrl,
      dto.instagramUrl,
      dto.xUrl,
      dto.youtubeUrl,
      dto.notificationEmail,
      now,
    );

    return this.getAdminSettings();
  },
};
