import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.ts';

let dbInstance: Database.Database | null = null;

export const ProjectStatus = {
  Planned: 0,
  InProgress: 1,
  Completed: 2,
} as const;

export type ProjectStatusName = keyof typeof ProjectStatus;
export const PROJECT_STATUS_FROM_INT: Record<number, ProjectStatusName> = {
  0: 'Planned',
  1: 'InProgress',
  2: 'Completed',
};

export const ImageStage = {
  General: 0,
  Before: 1,
  During: 2,
  After: 3,
} as const;

export type ImageStageName = keyof typeof ImageStage;
export const IMAGE_STAGE_FROM_INT: Record<number, ImageStageName> = {
  0: 'General',
  1: 'Before',
  2: 'During',
  3: 'After',
};

export const MessageStatus = {
  New: 0,
  Read: 1,
  Handled: 2,
} as const;

export type MessageStatusName = keyof typeof MessageStatus;
export const MESSAGE_STATUS_FROM_INT: Record<number, MessageStatusName> = {
  0: 'New',
  1: 'Read',
  2: 'Handled',
};

export const EmailNotificationStatus = {
  Pending: 0,
  Sent: 1,
  Failed: 2,
} as const;

export type EmailNotificationStatusName = keyof typeof EmailNotificationStatus;
export const EMAIL_NOTIFICATION_FROM_INT: Record<number, EmailNotificationStatusName> = {
  0: 'Pending',
  1: 'Sent',
  2: 'Failed',
};

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dir = path.dirname(config.dbFilePath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(config.dbFilePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  initializeSchema(db);
  dbInstance = db;
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS AdminUsers (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      fullName TEXT,
      passwordHash TEXT NOT NULL,
      failedLoginAttempts INTEGER NOT NULL DEFAULT 0,
      lockoutEndUtc TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS SiteSettings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      siteName TEXT NOT NULL,
      heroTitle TEXT,
      heroSubtitle TEXT,
      aboutTitle TEXT,
      aboutText TEXT,
      phone TEXT,
      whatsAppNumber TEXT,
      email TEXT,
      address TEXT,
      workingHours TEXT,
      facebookUrl TEXT,
      instagramUrl TEXT,
      xUrl TEXT,
      youTubeUrl TEXT,
      notificationEmail TEXT,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      displayOrder INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      slug TEXT,
      shortDescription TEXT NOT NULL,
      description TEXT,
      displayOrder INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT,
      shortDescription TEXT NOT NULL,
      description TEXT NOT NULL,
      categoryId INTEGER NOT NULL,
      status INTEGER NOT NULL DEFAULT 0,
      isPublished INTEGER NOT NULL DEFAULT 0,
      isFeatured INTEGER NOT NULL DEFAULT 0,
      city TEXT,
      executionDate TEXT,
      areaInSquareMeters REAL,
      durationInDays INTEGER,
      clientName TEXT,
      displayOrder INTEGER NOT NULL DEFAULT 0,
      rowVersion INTEGER NOT NULL DEFAULT 1,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      deletedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES Categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS ProjectServices (
      projectId INTEGER NOT NULL,
      serviceId INTEGER NOT NULL,
      PRIMARY KEY (projectId, serviceId),
      FOREIGN KEY (projectId) REFERENCES Projects(id) ON DELETE CASCADE,
      FOREIGN KEY (serviceId) REFERENCES Services(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS ProjectMaterials (
      projectId INTEGER NOT NULL,
      materialId INTEGER NOT NULL,
      PRIMARY KEY (projectId, materialId),
      FOREIGN KEY (projectId) REFERENCES Projects(id) ON DELETE CASCADE,
      FOREIGN KEY (materialId) REFERENCES Materials(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS ProjectImages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      filePath TEXT NOT NULL,
      thumbnailPath TEXT NOT NULL,
      originalFileName TEXT NOT NULL,
      contentType TEXT NOT NULL,
      sizeInBytes INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      altText TEXT,
      stage INTEGER NOT NULL DEFAULT 0,
      displayOrder INTEGER NOT NULL DEFAULT 0,
      isCover INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES Projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ContactMessages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 0,
      notificationStatus INTEGER NOT NULL DEFAULT 0,
      ipAddress TEXT,
      createdAt TEXT NOT NULL,
      readAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_projects_pub_del_order
      ON Projects (isPublished, isDeleted, displayOrder);

    CREATE INDEX IF NOT EXISTS idx_projects_category
      ON Projects (categoryId);

    CREATE INDEX IF NOT EXISTS idx_project_images_proj_order
      ON ProjectImages (projectId, displayOrder);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_project_images_single_cover
      ON ProjectImages (projectId)
      WHERE isCover = 1;

    CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created
      ON ContactMessages (status, createdAt);
  `);
}

export function buildUrlSegment(id: number, slug: string | null | undefined): string {
  const clean = (slug || '').trim();
  return clean ? `${id}-${clean}` : String(id);
}

export function nowUtcIso(): string {
  return new Date().toISOString();
}
