import { getDb } from '../infrastructure/db.ts';
import { buildPublicUploadUrl } from '../infrastructure/storage.ts';
import {
  buildUrlSegment,
  IntToImageStage,
  IntToProjectStatus,
  PagedResult,
  ProjectStatus,
  ProjectStatusToInt,
} from '../domain/types.ts';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationException,
} from '../domain/errors.ts';
import {
  createProjectSchema,
  publishProjectSchema,
  updateProjectSchema,
  validateOrThrow,
} from '../validation/schemas.ts';

export interface PublicProjectListItemDto {
  id: number;
  urlSegment: string;
  title: string;
  shortDescription: string;
  category: { id: number; name: string };
  status: ProjectStatus;
  city: string | null;
  executionDate: string | null;
  coverImage: { url: string; thumbnailUrl: string; altText: string | null } | null;
  isFeatured: boolean;
}

export interface PublicProjectDetailsDto extends PublicProjectListItemDto {
  description: string;
  areaInSquareMeters: number | null;
  durationInDays: number | null;
  services: Array<{ id: number; name: string; urlSegment: string }>;
  materials: Array<{ id: number; name: string }>;
  images: Array<{
    id: number;
    url: string;
    thumbnailUrl: string;
    altText: string | null;
    stage: string;
    isCover: boolean;
    displayOrder: number;
  }>;
}

export interface AdminProjectListItemDto {
  id: number;
  urlSegment: string;
  title: string;
  shortDescription: string;
  category: { id: number; name: string };
  status: ProjectStatus;
  isPublished: boolean;
  isFeatured: boolean;
  city: string | null;
  executionDate: string | null;
  clientName: string | null;
  displayOrder: number;
  rowVersion: number;
  imageCount: number;
  coverImage: { url: string; thumbnailUrl: string; altText: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProjectDetailsDto extends AdminProjectListItemDto {
  slug: string | null;
  description: string;
  categoryId: number;
  areaInSquareMeters: number | null;
  durationInDays: number | null;
  serviceIds: number[];
  materialIds: number[];
  services: Array<{ id: number; name: string }>;
  materials: Array<{ id: number; name: string }>;
  images: Array<{
    id: number;
    url: string;
    thumbnailUrl: string;
    originalFileName: string;
    contentType: string;
    sizeInBytes: number;
    width: number;
    height: number;
    altText: string | null;
    stage: string;
    isCover: boolean;
    displayOrder: number;
    createdAt: string;
  }>;
}

function parsePagination(rawPage: unknown, rawPageSize: unknown): { page: number; pageSize: number } {
  const page = rawPage === undefined || rawPage === '' ? 1 : Number(rawPage);
  const pageSize = rawPageSize === undefined || rawPageSize === '' ? 12 : Number(rawPageSize);

  if (!Number.isInteger(page) || page < 1) {
    throw new BadRequestException('رقم الصفحة (page) يجب أن يكون عدداً صحيحاً يبدأ من 1.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new BadRequestException('حجم الصفحة (pageSize) يجب أن يكون بين 1 و50.');
  }
  return { page, pageSize };
}

function parseOptionalInt(val: unknown, label: string): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  if (!Number.isInteger(n) || n <= 0) {
    throw new BadRequestException(`معامل ${label} غير صالح.`);
  }
  return n;
}

function parseOptionalStatus(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const s = String(val) as ProjectStatus;
  if (!(s in ProjectStatusToInt)) {
    throw new BadRequestException('قيمة حالة المشروع (status) غير صالحة.');
  }
  return ProjectStatusToInt[s];
}

function parseOptionalBool(val: unknown, label: string): boolean | null {
  if (val === undefined || val === null || val === '') return null;
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  throw new BadRequestException(`قيمة معامل ${label} يجب أن تكون true أو false.`);
}

function assertReferencesValid(categoryId: number, serviceIds: number[], materialIds: number[]): void {
  const db = getDb();
  const errors: Record<string, string[]> = {};

  const category = db
    .prepare(`SELECT Id, IsActive FROM Categories WHERE Id = ?`)
    .get(categoryId) as { Id: number; IsActive: number } | undefined;
  if (!category || category.IsActive !== 1) {
    errors.categoryId = ['التصنيف المختار غير موجود أو غير فعّال.'];
  }

  if (serviceIds.length > 0) {
    const placeholders = serviceIds.map(() => '?').join(',');
    const foundServices = db
      .prepare(`SELECT Id FROM Services WHERE Id IN (${placeholders})`)
      .all(...serviceIds) as Array<{ Id: number }>;
    if (foundServices.length !== serviceIds.length) {
      errors.serviceIds = ['توجد خدمة واحدة أو أكثر غير موجودة في النظام.'];
    }
  }

  if (materialIds.length > 0) {
    const placeholders = materialIds.map(() => '?').join(',');
    const foundMaterials = db
      .prepare(`SELECT Id FROM Materials WHERE Id IN (${placeholders})`)
      .all(...materialIds) as Array<{ Id: number }>;
    if (foundMaterials.length !== materialIds.length) {
      errors.materialIds = ['توجد مادة واحدة أو أكثر غير موجودة في النظام.'];
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationException(errors);
  }
}

export const projectService = {
  getPublicProjects(query: Record<string, unknown>): PagedResult<PublicProjectListItemDto> {
    const { page, pageSize } = parsePagination(query.page, query.pageSize);
    const categoryId = parseOptionalInt(query.categoryId, 'categoryId');
    const serviceId = parseOptionalInt(query.serviceId, 'serviceId');
    const materialId = parseOptionalInt(query.materialId, 'materialId');
    const statusInt = parseOptionalStatus(query.status);
    const featured = parseOptionalBool(query.featured, 'featured');
    const search = typeof query.search === 'string' ? query.search.trim() : '';

    const where: string[] = ['p.IsPublished = 1', 'p.IsDeleted = 0', 'c.IsActive = 1'];
    const params: unknown[] = [];

    if (categoryId !== null) {
      where.push('p.CategoryId = ?');
      params.push(categoryId);
    }
    if (statusInt !== null) {
      where.push('p.Status = ?');
      params.push(statusInt);
    }
    if (featured !== null) {
      where.push('p.IsFeatured = ?');
      params.push(featured ? 1 : 0);
    }
    if (serviceId !== null) {
      where.push(
        `EXISTS (
           SELECT 1 FROM ProjectServices ps
           INNER JOIN Services s ON s.Id = ps.ServiceId
           WHERE ps.ProjectId = p.Id AND ps.ServiceId = ? AND s.IsActive = 1
         )`,
      );
      params.push(serviceId);
    }
    if (materialId !== null) {
      where.push(
        `EXISTS (
           SELECT 1 FROM ProjectMaterials pm
           INNER JOIN Materials m ON m.Id = pm.MaterialId
           WHERE pm.ProjectId = p.Id AND pm.MaterialId = ? AND m.IsActive = 1
         )`,
      );
      params.push(materialId);
    }
    if (search.length > 0) {
      where.push('(p.Title LIKE ? OR p.ShortDescription LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like);
    }

    const whereSql = where.join(' AND ');
    const db = getDb();

    const countRow = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM Projects p
         INNER JOIN Categories c ON c.Id = p.CategoryId
         WHERE ${whereSql}`,
      )
      .get(...params) as { total: number };

    const totalCount = countRow.total;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
    const offset = (page - 1) * pageSize;

    const rows = db
      .prepare(
        `SELECT p.Id, p.Title, p.Slug, p.ShortDescription, p.Status, p.City, p.ExecutionDate, p.IsFeatured,
                c.Id AS CategoryId, c.Name AS CategoryName,
                img.FilePath AS CoverFilePath, img.ThumbnailPath AS CoverThumbPath, img.AltText AS CoverAltText
         FROM Projects p
         INNER JOIN Categories c ON c.Id = p.CategoryId
         LEFT JOIN ProjectImages img ON img.ProjectId = p.Id AND img.IsCover = 1
         WHERE ${whereSql}
         ORDER BY p.DisplayOrder ASC, p.CreatedAt DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, offset) as any[];

    const items: PublicProjectListItemDto[] = rows.map((r) => ({
      id: r.Id,
      urlSegment: buildUrlSegment(r.Id, r.Slug),
      title: r.Title,
      shortDescription: r.ShortDescription,
      category: { id: r.CategoryId, name: r.CategoryName },
      status: IntToProjectStatus[r.Status] ?? ProjectStatus.Planned,
      city: r.City,
      executionDate: r.ExecutionDate,
      coverImage: r.CoverFilePath
        ? {
            url: buildPublicUploadUrl(r.CoverFilePath),
            thumbnailUrl: buildPublicUploadUrl(r.CoverThumbPath),
            altText: r.CoverAltText,
          }
        : null,
      isFeatured: r.IsFeatured === 1,
    }));

    return { items, page, pageSize, totalCount, totalPages };
  },

  getPublicProjectById(id: number): PublicProjectDetailsDto {
    const db = getDb();
    const r = db
      .prepare(
        `SELECT p.Id, p.Title, p.Slug, p.ShortDescription, p.Description, p.Status,
                p.City, p.ExecutionDate, p.AreaInSquareMeters, p.DurationInDays, p.IsFeatured,
                c.Id AS CategoryId, c.Name AS CategoryName
         FROM Projects p
         INNER JOIN Categories c ON c.Id = p.CategoryId
         WHERE p.Id = ? AND p.IsPublished = 1 AND p.IsDeleted = 0 AND c.IsActive = 1`,
      )
      .get(id) as any;

    if (!r) {
      throw new NotFoundException('المشروع غير موجود.');
    }

    // Active services only in public API
    const services = db
      .prepare(
        `SELECT s.Id, s.Name, s.Slug
         FROM ProjectServices ps
         INNER JOIN Services s ON s.Id = ps.ServiceId
         WHERE ps.ProjectId = ? AND s.IsActive = 1
         ORDER BY s.DisplayOrder ASC, s.Id ASC`,
      )
      .all(id) as any[];

    // Active materials only in public API
    const materials = db
      .prepare(
        `SELECT m.Id, m.Name
         FROM ProjectMaterials pm
         INNER JOIN Materials m ON m.Id = pm.MaterialId
         WHERE pm.ProjectId = ? AND m.IsActive = 1
         ORDER BY m.Name ASC`,
      )
      .all(id) as any[];

    const images = db
      .prepare(
        `SELECT Id, FilePath, ThumbnailPath, AltText, Stage, IsCover, DisplayOrder
         FROM ProjectImages
         WHERE ProjectId = ?
         ORDER BY DisplayOrder ASC, Id ASC`,
      )
      .all(id) as any[];

    const mappedImages = images.map((img) => ({
      id: img.Id,
      url: buildPublicUploadUrl(img.FilePath),
      thumbnailUrl: buildPublicUploadUrl(img.ThumbnailPath),
      altText: img.AltText,
      stage: IntToImageStage[img.Stage] ?? 'General',
      isCover: img.IsCover === 1,
      displayOrder: img.DisplayOrder,
    }));

    const cover = mappedImages.find((i) => i.isCover) ?? null;

    return {
      id: r.Id,
      urlSegment: buildUrlSegment(r.Id, r.Slug),
      title: r.Title,
      shortDescription: r.ShortDescription,
      description: r.Description,
      category: { id: r.CategoryId, name: r.CategoryName },
      status: IntToProjectStatus[r.Status] ?? ProjectStatus.Planned,
      city: r.City,
      executionDate: r.ExecutionDate,
      areaInSquareMeters: r.AreaInSquareMeters,
      durationInDays: r.DurationInDays,
      isFeatured: r.IsFeatured === 1,
      coverImage: cover
        ? { url: cover.url, thumbnailUrl: cover.thumbnailUrl, altText: cover.altText }
        : null,
      services: services.map((s) => ({
        id: s.Id,
        name: s.Name,
        urlSegment: buildUrlSegment(s.Id, s.Slug),
      })),
      materials: materials.map((m) => ({ id: m.Id, name: m.Name })),
      images: mappedImages,
    };
  },

  getAdminProjects(query: Record<string, unknown>): PagedResult<AdminProjectListItemDto> {
    const { page, pageSize } = parsePagination(query.page, query.pageSize);
    const categoryId = parseOptionalInt(query.categoryId, 'categoryId');
    const statusInt = parseOptionalStatus(query.status);
    const isPublished = parseOptionalBool(query.isPublished, 'isPublished');
    const search = typeof query.search === 'string' ? query.search.trim() : '';

    const where: string[] = ['p.IsDeleted = 0'];
    const params: unknown[] = [];

    if (categoryId !== null) {
      where.push('p.CategoryId = ?');
      params.push(categoryId);
    }
    if (statusInt !== null) {
      where.push('p.Status = ?');
      params.push(statusInt);
    }
    if (isPublished !== null) {
      where.push('p.IsPublished = ?');
      params.push(isPublished ? 1 : 0);
    }
    if (search.length > 0) {
      where.push('(p.Title LIKE ? OR p.ShortDescription LIKE ? OR IFNULL(p.ClientName, \'\') LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const whereSql = where.join(' AND ');
    const db = getDb();

    const countRow = db
      .prepare(`SELECT COUNT(*) AS total FROM Projects p WHERE ${whereSql}`)
      .get(...params) as { total: number };

    const totalCount = countRow.total;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
    const offset = (page - 1) * pageSize;

    const rows = db
      .prepare(
        `SELECT p.*, c.Name AS CategoryName,
                img.FilePath AS CoverFilePath, img.ThumbnailPath AS CoverThumbPath, img.AltText AS CoverAltText,
                (SELECT COUNT(*) FROM ProjectImages pi WHERE pi.ProjectId = p.Id) AS ImageCount
         FROM Projects p
         INNER JOIN Categories c ON c.Id = p.CategoryId
         LEFT JOIN ProjectImages img ON img.ProjectId = p.Id AND img.IsCover = 1
         WHERE ${whereSql}
         ORDER BY p.DisplayOrder ASC, p.CreatedAt DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, offset) as any[];

    const items: AdminProjectListItemDto[] = rows.map((r) => ({
      id: r.Id,
      urlSegment: buildUrlSegment(r.Id, r.Slug),
      title: r.Title,
      shortDescription: r.ShortDescription,
      category: { id: r.CategoryId, name: r.CategoryName },
      status: IntToProjectStatus[r.Status] ?? ProjectStatus.Planned,
      isPublished: r.IsPublished === 1,
      isFeatured: r.IsFeatured === 1,
      city: r.City,
      executionDate: r.ExecutionDate,
      clientName: r.ClientName,
      displayOrder: r.DisplayOrder,
      rowVersion: r.RowVersion,
      imageCount: r.ImageCount,
      coverImage: r.CoverFilePath
        ? {
            url: buildPublicUploadUrl(r.CoverFilePath),
            thumbnailUrl: buildPublicUploadUrl(r.CoverThumbPath),
            altText: r.CoverAltText,
          }
        : null,
      createdAt: r.CreatedAt,
      updatedAt: r.UpdatedAt,
    }));

    return { items, page, pageSize, totalCount, totalPages };
  },

  getAdminProjectById(id: number): AdminProjectDetailsDto {
    const db = getDb();
    const r = db
      .prepare(
        `SELECT p.*, c.Name AS CategoryName
         FROM Projects p
         INNER JOIN Categories c ON c.Id = p.CategoryId
         WHERE p.Id = ? AND p.IsDeleted = 0`,
      )
      .get(id) as any;

    if (!r) {
      throw new NotFoundException('المشروع غير موجود.');
    }

    const services = db
      .prepare(
        `SELECT s.Id, s.Name
         FROM ProjectServices ps
         INNER JOIN Services s ON s.Id = ps.ServiceId
         WHERE ps.ProjectId = ?
         ORDER BY s.DisplayOrder ASC, s.Id ASC`,
      )
      .all(id) as Array<{ Id: number; Name: string }>;

    const materials = db
      .prepare(
        `SELECT m.Id, m.Name
         FROM ProjectMaterials pm
         INNER JOIN Materials m ON m.Id = pm.MaterialId
         WHERE pm.ProjectId = ?
         ORDER BY m.Name ASC`,
      )
      .all(id) as Array<{ Id: number; Name: string }>;

    const images = db
      .prepare(
        `SELECT * FROM ProjectImages WHERE ProjectId = ? ORDER BY DisplayOrder ASC, Id ASC`,
      )
      .all(id) as any[];

    const mappedImages = images.map((img) => ({
      id: img.Id,
      url: buildPublicUploadUrl(img.FilePath),
      thumbnailUrl: buildPublicUploadUrl(img.ThumbnailPath),
      originalFileName: img.OriginalFileName,
      contentType: img.ContentType,
      sizeInBytes: img.SizeInBytes,
      width: img.Width,
      height: img.Height,
      altText: img.AltText,
      stage: IntToImageStage[img.Stage] ?? 'General',
      isCover: img.IsCover === 1,
      displayOrder: img.DisplayOrder,
      createdAt: img.CreatedAt,
    }));

    const cover = mappedImages.find((i) => i.isCover) ?? null;

    return {
      id: r.Id,
      urlSegment: buildUrlSegment(r.Id, r.Slug),
      title: r.Title,
      slug: r.Slug,
      shortDescription: r.ShortDescription,
      description: r.Description,
      categoryId: r.CategoryId,
      category: { id: r.CategoryId, name: r.CategoryName },
      status: IntToProjectStatus[r.Status] ?? ProjectStatus.Planned,
      isPublished: r.IsPublished === 1,
      isFeatured: r.IsFeatured === 1,
      city: r.City,
      executionDate: r.ExecutionDate,
      areaInSquareMeters: r.AreaInSquareMeters,
      durationInDays: r.DurationInDays,
      clientName: r.ClientName,
      displayOrder: r.DisplayOrder,
      rowVersion: r.RowVersion,
      imageCount: mappedImages.length,
      coverImage: cover
        ? { url: cover.url, thumbnailUrl: cover.thumbnailUrl, altText: cover.altText }
        : null,
      serviceIds: services.map((s) => s.Id),
      materialIds: materials.map((m) => m.Id),
      services: services.map((s) => ({ id: s.Id, name: s.Name })),
      materials: materials.map((m) => ({ id: m.Id, name: m.Name })),
      images: mappedImages,
      createdAt: r.CreatedAt,
      updatedAt: r.UpdatedAt,
    };
  },

  createProject(input: unknown): AdminProjectDetailsDto {
    const dto = validateOrThrow(createProjectSchema, input);
    assertReferencesValid(dto.categoryId, dto.serviceIds, dto.materialIds);

    const db = getDb();
    const now = new Date().toISOString();

    const txn = db.transaction(() => {
      const res = db
        .prepare(
          `INSERT INTO Projects (
             Title, Slug, ShortDescription, Description, CategoryId, Status,
             IsPublished, IsFeatured, City, ExecutionDate, AreaInSquareMeters,
             DurationInDays, ClientName, DisplayOrder, RowVersion, IsDeleted, CreatedAt, UpdatedAt
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
        )
        .run(
          dto.title,
          dto.slug,
          dto.shortDescription,
          dto.description,
          dto.categoryId,
          ProjectStatusToInt[dto.status],
          dto.isPublished ? 1 : 0,
          dto.isFeatured ? 1 : 0,
          dto.city,
          dto.executionDate,
          dto.areaInSquareMeters,
          dto.durationInDays,
          dto.clientName,
          dto.displayOrder,
          now,
          now,
        );

      const projectId = Number(res.lastInsertRowid);
      const insertSvc = db.prepare(
        `INSERT INTO ProjectServices (ProjectId, ServiceId) VALUES (?, ?)`,
      );
      for (const sid of dto.serviceIds) insertSvc.run(projectId, sid);

      const insertMat = db.prepare(
        `INSERT INTO ProjectMaterials (ProjectId, MaterialId) VALUES (?, ?)`,
      );
      for (const mid of dto.materialIds) insertMat.run(projectId, mid);

      return projectId;
    });

    const newId = txn();
    return this.getAdminProjectById(newId);
  },

  updateProject(id: number, input: unknown): AdminProjectDetailsDto {
    const dto = validateOrThrow(updateProjectSchema, input);
    const db = getDb();

    const existing = db
      .prepare(`SELECT Id, RowVersion FROM Projects WHERE Id = ? AND IsDeleted = 0`)
      .get(id) as { Id: number; RowVersion: number } | undefined;

    if (!existing) {
      throw new NotFoundException('المشروع غير موجود.');
    }

    assertReferencesValid(dto.categoryId, dto.serviceIds, dto.materialIds);

    const now = new Date().toISOString();
    const txn = db.transaction(() => {
      const updated = db
        .prepare(
          `UPDATE Projects
           SET Title = ?, Slug = ?, ShortDescription = ?, Description = ?, CategoryId = ?,
               Status = ?, IsPublished = ?, IsFeatured = ?, City = ?, ExecutionDate = ?,
               AreaInSquareMeters = ?, DurationInDays = ?, ClientName = ?, DisplayOrder = ?,
               RowVersion = RowVersion + 1, UpdatedAt = ?
           WHERE Id = ? AND IsDeleted = 0 AND RowVersion = ?`,
        )
        .run(
          dto.title,
          dto.slug,
          dto.shortDescription,
          dto.description,
          dto.categoryId,
          ProjectStatusToInt[dto.status],
          dto.isPublished ? 1 : 0,
          dto.isFeatured ? 1 : 0,
          dto.city,
          dto.executionDate,
          dto.areaInSquareMeters,
          dto.durationInDays,
          dto.clientName,
          dto.displayOrder,
          now,
          id,
          dto.rowVersion,
        );

      if (updated.changes === 0) {
        throw new ConflictException(
          'تم تعديل هذا المشروع مؤخراً من جلسة أخرى. يرجى إعادة تحميل البيانات ثم المحاولة مجدداً.',
        );
      }

      db.prepare(`DELETE FROM ProjectServices WHERE ProjectId = ?`).run(id);
      const insertSvc = db.prepare(
        `INSERT INTO ProjectServices (ProjectId, ServiceId) VALUES (?, ?)`,
      );
      for (const sid of dto.serviceIds) insertSvc.run(id, sid);

      db.prepare(`DELETE FROM ProjectMaterials WHERE ProjectId = ?`).run(id);
      const insertMat = db.prepare(
        `INSERT INTO ProjectMaterials (ProjectId, MaterialId) VALUES (?, ?)`,
      );
      for (const mid of dto.materialIds) insertMat.run(id, mid);
    });

    txn();
    return this.getAdminProjectById(id);
  },

  setPublishStatus(id: number, input: unknown): void {
    const dto = validateOrThrow(publishProjectSchema, input);
    const db = getDb();

    const res = db
      .prepare(
        `UPDATE Projects
         SET IsPublished = ?, RowVersion = RowVersion + 1, UpdatedAt = ?
         WHERE Id = ? AND IsDeleted = 0`,
      )
      .run(dto.isPublished ? 1 : 0, new Date().toISOString(), id);

    if (res.changes === 0) {
      throw new NotFoundException('المشروع غير موجود.');
    }
  },

  softDeleteProject(id: number): void {
    const db = getDb();
    const now = new Date().toISOString();
    const res = db
      .prepare(
        `UPDATE Projects
         SET IsDeleted = 1, DeletedAt = ?, UpdatedAt = ?
         WHERE Id = ? AND IsDeleted = 0`,
      )
      .run(now, now, id);

    if (res.changes === 0) {
      throw new NotFoundException('المشروع غير موجود.');
    }
  },
};
