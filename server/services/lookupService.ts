import { getDb } from '../infrastructure/db.ts';
import { buildUrlSegment } from '../domain/types.ts';
import { ConflictException, NotFoundException } from '../domain/errors.ts';
import {
  categorySchema,
  materialSchema,
  serviceSchema,
  validateOrThrow,
} from '../validation/schemas.ts';

const LINKED_DELETE_CONFLICT_MSG =
  'لا يمكن الحذف لارتباطه بمشاريع، يمكنك إيقاف تفعيله بدلاً من ذلك';

export interface CategoryDto {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDto {
  id: number;
  urlSegment: string;
  name: string;
  slug: string | null;
  shortDescription: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialDto {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapCategory(row: any): CategoryDto {
  return {
    id: row.Id,
    name: row.Name,
    displayOrder: row.DisplayOrder,
    isActive: row.IsActive === 1,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

function mapService(row: any): ServiceDto {
  return {
    id: row.Id,
    urlSegment: buildUrlSegment(row.Id, row.Slug),
    name: row.Name,
    slug: row.Slug,
    shortDescription: row.ShortDescription,
    description: row.Description,
    displayOrder: row.DisplayOrder,
    isActive: row.IsActive === 1,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

function mapMaterial(row: any): MaterialDto {
  return {
    id: row.Id,
    name: row.Name,
    isActive: row.IsActive === 1,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

export const lookupService = {
  // ---- CATEGORIES ----
  getPublicCategories(): Array<{ id: number; name: string; displayOrder: number }> {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT Id, Name, DisplayOrder FROM Categories
         WHERE IsActive = 1 ORDER BY DisplayOrder ASC, Id ASC`,
      )
      .all() as any[];
    return rows.map((r) => ({ id: r.Id, name: r.Name, displayOrder: r.DisplayOrder }));
  },

  getAdminCategories(): CategoryDto[] {
    const db = getDb();
    const rows = db
      .prepare(`SELECT * FROM Categories ORDER BY DisplayOrder ASC, Id ASC`)
      .all() as any[];
    return rows.map(mapCategory);
  },

  getAdminCategoryById(id: number): CategoryDto {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM Categories WHERE Id = ?`).get(id);
    if (!row) throw new NotFoundException('التصنيف غير موجود.');
    return mapCategory(row);
  },

  createCategory(input: unknown): CategoryDto {
    const dto = validateOrThrow(categorySchema, input);
    const db = getDb();

    const dup = db
      .prepare(`SELECT Id FROM Categories WHERE Name = ? COLLATE NOCASE`)
      .get(dto.name);
    if (dup) throw new ConflictException('يوجد تصنيف آخر بنفس الاسم.');

    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO Categories (Name, DisplayOrder, IsActive, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(dto.name, dto.displayOrder, dto.isActive ? 1 : 0, now, now);

    return this.getAdminCategoryById(Number(result.lastInsertRowid));
  },

  updateCategory(id: number, input: unknown): CategoryDto {
    const dto = validateOrThrow(categorySchema, input);
    const db = getDb();

    const existing = db.prepare(`SELECT Id FROM Categories WHERE Id = ?`).get(id);
    if (!existing) throw new NotFoundException('التصنيف غير موجود.');

    const dup = db
      .prepare(`SELECT Id FROM Categories WHERE Name = ? COLLATE NOCASE AND Id != ?`)
      .get(dto.name, id);
    if (dup) throw new ConflictException('يوجد تصنيف آخر بنفس الاسم.');

    db.prepare(
      `UPDATE Categories SET Name = ?, DisplayOrder = ?, IsActive = ?, UpdatedAt = ? WHERE Id = ?`,
    ).run(dto.name, dto.displayOrder, dto.isActive ? 1 : 0, new Date().toISOString(), id);

    return this.getAdminCategoryById(id);
  },

  deleteCategory(id: number): void {
    const db = getDb();
    const existing = db.prepare(`SELECT Id FROM Categories WHERE Id = ?`).get(id);
    if (!existing) throw new NotFoundException('التصنيف غير موجود.');

    // Check ALL projects including soft-deleted projects per SOP section 9.3
    const linked = db
      .prepare(`SELECT COUNT(*) AS cnt FROM Projects WHERE CategoryId = ?`)
      .get(id) as { cnt: number };
    if (linked.cnt > 0) {
      throw new ConflictException(LINKED_DELETE_CONFLICT_MSG);
    }

    db.prepare(`DELETE FROM Categories WHERE Id = ?`).run(id);
  },

  // ---- SERVICES ----
  getPublicServices(): Array<{
    id: number;
    urlSegment: string;
    name: string;
    shortDescription: string;
    displayOrder: number;
  }> {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT Id, Name, Slug, ShortDescription, DisplayOrder
         FROM Services WHERE IsActive = 1 ORDER BY DisplayOrder ASC, Id ASC`,
      )
      .all() as any[];

    return rows.map((r) => ({
      id: r.Id,
      urlSegment: buildUrlSegment(r.Id, r.Slug),
      name: r.Name,
      shortDescription: r.ShortDescription,
      displayOrder: r.DisplayOrder,
    }));
  },

  getPublicServiceById(id: number): {
    id: number;
    urlSegment: string;
    name: string;
    shortDescription: string;
    description: string | null;
    displayOrder: number;
  } {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT Id, Name, Slug, ShortDescription, Description, DisplayOrder
         FROM Services WHERE Id = ? AND IsActive = 1`,
      )
      .get(id) as any;

    if (!row) throw new NotFoundException('الخدمة غير موجودة.');
    return {
      id: row.Id,
      urlSegment: buildUrlSegment(row.Id, row.Slug),
      name: row.Name,
      shortDescription: row.ShortDescription,
      description: row.Description,
      displayOrder: row.DisplayOrder,
    };
  },

  getAdminServices(): ServiceDto[] {
    const db = getDb();
    const rows = db
      .prepare(`SELECT * FROM Services ORDER BY DisplayOrder ASC, Id ASC`)
      .all() as any[];
    return rows.map(mapService);
  },

  getAdminServiceById(id: number): ServiceDto {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM Services WHERE Id = ?`).get(id);
    if (!row) throw new NotFoundException('الخدمة غير موجودة.');
    return mapService(row);
  },

  createService(input: unknown): ServiceDto {
    const dto = validateOrThrow(serviceSchema, input);
    const db = getDb();

    const dup = db
      .prepare(`SELECT Id FROM Services WHERE Name = ? COLLATE NOCASE`)
      .get(dto.name);
    if (dup) throw new ConflictException('توجد خدمة أخرى بنفس الاسم.');

    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO Services (Name, Slug, ShortDescription, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        dto.name,
        dto.slug,
        dto.shortDescription,
        dto.description,
        dto.displayOrder,
        dto.isActive ? 1 : 0,
        now,
        now,
      );

    return this.getAdminServiceById(Number(result.lastInsertRowid));
  },

  updateService(id: number, input: unknown): ServiceDto {
    const dto = validateOrThrow(serviceSchema, input);
    const db = getDb();

    const existing = db.prepare(`SELECT Id FROM Services WHERE Id = ?`).get(id);
    if (!existing) throw new NotFoundException('الخدمة غير موجودة.');

    const dup = db
      .prepare(`SELECT Id FROM Services WHERE Name = ? COLLATE NOCASE AND Id != ?`)
      .get(dto.name, id);
    if (dup) throw new ConflictException('توجد خدمة أخرى بنفس الاسم.');

    db.prepare(
      `UPDATE Services
       SET Name = ?, Slug = ?, ShortDescription = ?, Description = ?, DisplayOrder = ?, IsActive = ?, UpdatedAt = ?
       WHERE Id = ?`,
    ).run(
      dto.name,
      dto.slug,
      dto.shortDescription,
      dto.description,
      dto.displayOrder,
      dto.isActive ? 1 : 0,
      new Date().toISOString(),
      id,
    );

    return this.getAdminServiceById(id);
  },

  deleteService(id: number): void {
    const db = getDb();
    const existing = db.prepare(`SELECT Id FROM Services WHERE Id = ?`).get(id);
    if (!existing) throw new NotFoundException('الخدمة غير موجودة.');

    const linked = db
      .prepare(`SELECT COUNT(*) AS cnt FROM ProjectServices WHERE ServiceId = ?`)
      .get(id) as { cnt: number };
    if (linked.cnt > 0) {
      throw new ConflictException(LINKED_DELETE_CONFLICT_MSG);
    }

    db.prepare(`DELETE FROM Services WHERE Id = ?`).run(id);
  },

  // ---- MATERIALS ----
  getPublicMaterials(): Array<{ id: number; name: string }> {
    const db = getDb();
    const rows = db
      .prepare(`SELECT Id, Name FROM Materials WHERE IsActive = 1 ORDER BY Name ASC, Id ASC`)
      .all() as any[];
    return rows.map((r) => ({ id: r.Id, name: r.Name }));
  },

  getAdminMaterials(): MaterialDto[] {
    const db = getDb();
    const rows = db
      .prepare(`SELECT * FROM Materials ORDER BY Name ASC, Id ASC`)
      .all() as any[];
    return rows.map(mapMaterial);
  },

  getAdminMaterialById(id: number): MaterialDto {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM Materials WHERE Id = ?`).get(id);
    if (!row) throw new NotFoundException('المادة غير موجودة.');
    return mapMaterial(row);
  },

  createMaterial(input: unknown): MaterialDto {
    const dto = validateOrThrow(materialSchema, input);
    const db = getDb();

    const dup = db
      .prepare(`SELECT Id FROM Materials WHERE Name = ? COLLATE NOCASE`)
      .get(dto.name);
    if (dup) throw new ConflictException('توجد مادة أخرى بنفس الاسم.');

    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO Materials (Name, IsActive, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?)`,
      )
      .run(dto.name, dto.isActive ? 1 : 0, now, now);

    return this.getAdminMaterialById(Number(result.lastInsertRowid));
  },

  updateMaterial(id: number, input: unknown): MaterialDto {
    const dto = validateOrThrow(materialSchema, input);
    const db = getDb();

    const existing = db.prepare(`SELECT Id FROM Materials WHERE Id = ?`).get(id);
    if (!existing) throw new NotFoundException('المادة غير موجودة.');

    const dup = db
      .prepare(`SELECT Id FROM Materials WHERE Name = ? COLLATE NOCASE AND Id != ?`)
      .get(dto.name, id);
    if (dup) throw new ConflictException('توجد مادة أخرى بنفس الاسم.');

    db.prepare(`UPDATE Materials SET Name = ?, IsActive = ?, UpdatedAt = ? WHERE Id = ?`).run(
      dto.name,
      dto.isActive ? 1 : 0,
      new Date().toISOString(),
      id,
    );

    return this.getAdminMaterialById(id);
  },

  deleteMaterial(id: number): void {
    const db = getDb();
    const existing = db.prepare(`SELECT Id FROM Materials WHERE Id = ?`).get(id);
    if (!existing) throw new NotFoundException('المادة غير موجودة.');

    const linked = db
      .prepare(`SELECT COUNT(*) AS cnt FROM ProjectMaterials WHERE MaterialId = ?`)
      .get(id) as { cnt: number };
    if (linked.cnt > 0) {
      throw new ConflictException(LINKED_DELETE_CONFLICT_MSG);
    }

    db.prepare(`DELETE FROM Materials WHERE Id = ?`).run(id);
  },
};
