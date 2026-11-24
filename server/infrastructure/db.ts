import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config.ts';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbDir = path.dirname(config.dbFilePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

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
      Id TEXT PRIMARY KEY,
      Username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      FullName TEXT,
      PasswordHash TEXT NOT NULL,
      FailedLoginAttempts INTEGER NOT NULL DEFAULT 0,
      LockoutEndUtc TEXT,
      CreatedAt TEXT NOT NULL,
      UpdatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Categories (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      DisplayOrder INTEGER NOT NULL DEFAULT 0,
      IsActive INTEGER NOT NULL DEFAULT 1,
      CreatedAt TEXT NOT NULL,
      UpdatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Services (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      Slug TEXT,
      ShortDescription TEXT NOT NULL,
      Description TEXT,
      DisplayOrder INTEGER NOT NULL DEFAULT 0,
      IsActive INTEGER NOT NULL DEFAULT 1,
      CreatedAt TEXT NOT NULL,
      UpdatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Materials (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      IsActive INTEGER NOT NULL DEFAULT 1,
      CreatedAt TEXT NOT NULL,
      UpdatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Projects (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Title TEXT NOT NULL,
      Slug TEXT,
      ShortDescription TEXT NOT NULL,
      Description TEXT NOT NULL,
      CategoryId INTEGER NOT NULL,
      Status INTEGER NOT NULL DEFAULT 0,
      IsPublished INTEGER NOT NULL DEFAULT 0,
      IsFeatured INTEGER NOT NULL DEFAULT 0,
      City TEXT,
      ExecutionDate TEXT,
      AreaInSquareMeters REAL,
      DurationInDays INTEGER,
      ClientName TEXT,
      DisplayOrder INTEGER NOT NULL DEFAULT 0,
      RowVersion INTEGER NOT NULL DEFAULT 1,
      IsDeleted INTEGER NOT NULL DEFAULT 0,
      DeletedAt TEXT,
      CreatedAt TEXT NOT NULL,
      UpdatedAt TEXT NOT NULL,
      FOREIGN KEY (CategoryId) REFERENCES Categories(Id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS ProjectServices (
      ProjectId INTEGER NOT NULL,
      ServiceId INTEGER NOT NULL,
      PRIMARY KEY (ProjectId, ServiceId),
      FOREIGN KEY (ProjectId) REFERENCES Projects(Id) ON DELETE CASCADE,
      FOREIGN KEY (ServiceId) REFERENCES Services(Id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS ProjectMaterials (
      ProjectId INTEGER NOT NULL,
      MaterialId INTEGER NOT NULL,
      PRIMARY KEY (ProjectId, MaterialId),
      FOREIGN KEY (ProjectId) REFERENCES Projects(Id) ON DELETE CASCADE,
      FOREIGN KEY (MaterialId) REFERENCES Materials(Id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS ProjectImages (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      ProjectId INTEGER NOT NULL,
      FilePath TEXT NOT NULL,
      ThumbnailPath TEXT NOT NULL,
      OriginalFileName TEXT NOT NULL,
      ContentType TEXT NOT NULL,
      SizeInBytes INTEGER NOT NULL,
      Width INTEGER NOT NULL,
      Height INTEGER NOT NULL,
      AltText TEXT,
      Stage INTEGER NOT NULL DEFAULT 0,
      DisplayOrder INTEGER NOT NULL DEFAULT 0,
      IsCover INTEGER NOT NULL DEFAULT 0,
      CreatedAt TEXT NOT NULL,
      FOREIGN KEY (ProjectId) REFERENCES Projects(Id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ContactMessages (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      FullName TEXT NOT NULL,
      Phone TEXT NOT NULL,
      Email TEXT,
      Subject TEXT,
      Message TEXT NOT NULL,
      Status INTEGER NOT NULL DEFAULT 0,
      NotificationStatus INTEGER NOT NULL DEFAULT 0,
      IpAddress TEXT,
      CreatedAt TEXT NOT NULL,
      ReadAt TEXT
    );

    CREATE TABLE IF NOT EXISTS SiteSettings (
      Id INTEGER PRIMARY KEY CHECK (Id = 1),
      SiteName TEXT NOT NULL,
      HeroTitle TEXT,
      HeroSubtitle TEXT,
      AboutTitle TEXT,
      AboutText TEXT,
      Phone TEXT,
      WhatsAppNumber TEXT,
      Email TEXT,
      Address TEXT,
      WorkingHours TEXT,
      FacebookUrl TEXT,
      InstagramUrl TEXT,
      XUrl TEXT,
      YouTubeUrl TEXT,
      NotificationEmail TEXT,
      UpdatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS IDX_Projects_PublicList
      ON Projects (IsPublished, IsDeleted, DisplayOrder, CreatedAt);

    CREATE INDEX IF NOT EXISTS IDX_Projects_CategoryId
      ON Projects (CategoryId);

    CREATE INDEX IF NOT EXISTS IDX_ProjectImages_ProjectOrder
      ON ProjectImages (ProjectId, DisplayOrder);

    CREATE UNIQUE INDEX IF NOT EXISTS UX_ProjectImages_SingleCover
      ON ProjectImages (ProjectId) WHERE IsCover = 1;

    CREATE INDEX IF NOT EXISTS IDX_ContactMessages_StatusCreated
      ON ContactMessages (Status, CreatedAt);
  `);
}

export function checkDbHealth(): boolean {
  try {
    const db = getDb();
    const row = db.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
    return row?.ok === 1;
  } catch {
    return false;
  }
}
