import { config } from '../config.ts';
import { getDb } from '../infrastructure/db.ts';
import {
  buildPublicUploadUrl,
  deleteStoredFileSafe,
  processAndSaveProjectImage,
  ProcessedImageResult,
} from '../infrastructure/storage.ts';
import { ImageStage, ImageStageToInt, IntToImageStage } from '../domain/types.ts';
import { BadRequestException, NotFoundException } from '../domain/errors.ts';
import {
  reorderImagesSchema,
  updateImageMetadataSchema,
  validateOrThrow,
} from '../validation/schemas.ts';

export interface ProjectImageDto {
  id: number;
  projectId: number;
  url: string;
  thumbnailUrl: string;
  originalFileName: string;
  contentType: string;
  sizeInBytes: number;
  width: number;
  height: number;
  altText: string | null;
  stage: ImageStage;
  displayOrder: number;
  isCover: boolean;
  createdAt: string;
}

function mapImageRow(row: any): ProjectImageDto {
  return {
    id: row.Id,
    projectId: row.ProjectId,
    url: buildPublicUploadUrl(row.FilePath),
    thumbnailUrl: buildPublicUploadUrl(row.ThumbnailPath),
    originalFileName: row.OriginalFileName,
    contentType: row.ContentType,
    sizeInBytes: row.SizeInBytes,
    width: row.Width,
    height: row.Height,
    altText: row.AltText,
    stage: IntToImageStage[row.Stage] ?? ImageStage.General,
    displayOrder: row.DisplayOrder,
    isCover: row.IsCover === 1,
    createdAt: row.CreatedAt,
  };
}

function assertProjectExists(projectId: number): void {
  const db = getDb();
  const project = db
    .prepare(`SELECT Id FROM Projects WHERE Id = ? AND IsDeleted = 0`)
    .get(projectId);
  if (!project) {
    throw new NotFoundException('المشروع غير موجود.');
  }
}

export const imageService = {
  async uploadImages(
    projectId: number,
    files: Array<{ buffer: Buffer; originalname: string }>,
    rawStage?: unknown,
    rawAltText?: unknown,
  ): Promise<ProjectImageDto[]> {
    assertProjectExists(projectId);

    if (!files || files.length === 0) {
      throw new BadRequestException('يجب اختيار صورة واحدة على الأقل للرفع.');
    }
    if (files.length > config.storage.maxFilesPerRequest) {
      throw new BadRequestException(
        `الحد الأقصى لرفع الصور في الطلب الواحد هو ${config.storage.maxFilesPerRequest} صور.`,
      );
    }

    const stage =
      rawStage && String(rawStage).trim().length > 0
        ? (String(rawStage).trim() as ImageStage)
        : ImageStage.General;
    if (!(stage in ImageStageToInt)) {
      throw new BadRequestException('مرحلة التنفيذ غير صالحة (General, Before, During, After).');
    }

    const altTextTrimmed =
      typeof rawAltText === 'string' && rawAltText.trim().length > 0 ? rawAltText.trim() : null;
    if (altTextTrimmed && (altTextTrimmed.length > 250 || /[<>]/.test(altTextTrimmed))) {
      throw new BadRequestException('الوصف البديل غير صالح أو يتجاوز 250 حرفاً.');
    }

    const db = getDb();
    const countRow = db
      .prepare(`SELECT COUNT(*) AS cnt, MAX(DisplayOrder) AS maxOrder FROM ProjectImages WHERE ProjectId = ?`)
      .get(projectId) as { cnt: number; maxOrder: number | null };

    if (countRow.cnt + files.length > config.storage.maxImagesPerProject) {
      throw new BadRequestException(
        `تجاوز الحد الأقصى المسموح لصور المشروع (${config.storage.maxImagesPerProject} صورة).`,
      );
    }

    const processed: ProcessedImageResult[] = [];
    try {
      for (const file of files) {
        const saved = await processAndSaveProjectImage(projectId, file.buffer, file.originalname);
        processed.push(saved);
      }
    } catch (err) {
      for (const p of processed) {
        await deleteStoredFileSafe(p.filePath);
        await deleteStoredFileSafe(p.thumbnailPath);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const hadNoImages = countRow.cnt === 0;
    let nextOrder = countRow.maxOrder === null ? 0 : countRow.maxOrder + 1;

    try {
      const createdIds: number[] = [];
      const txn = db.transaction(() => {
        const stmt = db.prepare(
          `INSERT INTO ProjectImages (
             ProjectId, FilePath, ThumbnailPath, OriginalFileName, ContentType,
             SizeInBytes, Width, Height, AltText, Stage, DisplayOrder, IsCover, CreatedAt
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );

        processed.forEach((p, idx) => {
          const isCover = hadNoImages && idx === 0 ? 1 : 0;
          const res = stmt.run(
            projectId,
            p.filePath,
            p.thumbnailPath,
            p.originalFileName,
            p.contentType,
            p.sizeInBytes,
            p.width,
            p.height,
            altTextTrimmed,
            ImageStageToInt[stage],
            nextOrder++,
            isCover,
            now,
          );
          createdIds.push(Number(res.lastInsertRowid));
        });
      });

      txn();

      const placeholders = createdIds.map(() => '?').join(',');
      const rows = db
        .prepare(
          `SELECT * FROM ProjectImages WHERE Id IN (${placeholders}) ORDER BY DisplayOrder ASC`,
        )
        .all(...createdIds) as any[];

      return rows.map(mapImageRow);
    } catch (err) {
      // Cleanup disk files if DB insertion failed
      for (const p of processed) {
        await deleteStoredFileSafe(p.filePath);
        await deleteStoredFileSafe(p.thumbnailPath);
      }
      throw err;
    }
  },

  updateImageMetadata(projectId: number, imageId: number, input: unknown): ProjectImageDto {
    assertProjectExists(projectId);
    const dto = validateOrThrow(updateImageMetadataSchema, input);
    const db = getDb();

    const existing = db
      .prepare(`SELECT * FROM ProjectImages WHERE Id = ? AND ProjectId = ?`)
      .get(imageId, projectId);
    if (!existing) {
      throw new NotFoundException('الصورة غير موجودة ضمن هذا المشروع.');
    }

    db.prepare(`UPDATE ProjectImages SET AltText = ?, Stage = ? WHERE Id = ? AND ProjectId = ?`).run(
      dto.altText,
      ImageStageToInt[dto.stage],
      imageId,
      projectId,
    );

    const updated = db
      .prepare(`SELECT * FROM ProjectImages WHERE Id = ? AND ProjectId = ?`)
      .get(imageId, projectId);
    return mapImageRow(updated);
  },

  async replaceImageFile(
    projectId: number,
    imageId: number,
    file: { buffer: Buffer; originalname: string } | undefined,
  ): Promise<ProjectImageDto> {
    assertProjectExists(projectId);
    if (!file) {
      throw new BadRequestException('يجب إرفاق ملف صورة للاستبدال.');
    }

    const db = getDb();
    const existing = db
      .prepare(`SELECT * FROM ProjectImages WHERE Id = ? AND ProjectId = ?`)
      .get(imageId, projectId) as any;

    if (!existing) {
      throw new NotFoundException('الصورة غير موجودة ضمن هذا المشروع.');
    }

    const saved = await processAndSaveProjectImage(projectId, file.buffer, file.originalname);

    try {
      db.prepare(
        `UPDATE ProjectImages
         SET FilePath = ?, ThumbnailPath = ?, OriginalFileName = ?, ContentType = ?,
             SizeInBytes = ?, Width = ?, Height = ?
         WHERE Id = ? AND ProjectId = ?`,
      ).run(
        saved.filePath,
        saved.thumbnailPath,
        saved.originalFileName,
        saved.contentType,
        saved.sizeInBytes,
        saved.width,
        saved.height,
        imageId,
        projectId,
      );
    } catch (err) {
      await deleteStoredFileSafe(saved.filePath);
      await deleteStoredFileSafe(saved.thumbnailPath);
      throw err;
    }

    // Delete replaced files safely
    await deleteStoredFileSafe(existing.FilePath);
    await deleteStoredFileSafe(existing.ThumbnailPath);

    const updated = db
      .prepare(`SELECT * FROM ProjectImages WHERE Id = ? AND ProjectId = ?`)
      .get(imageId, projectId);
    return mapImageRow(updated);
  },

  setCoverImage(projectId: number, imageId: number): void {
    assertProjectExists(projectId);
    const db = getDb();

    const target = db
      .prepare(`SELECT Id FROM ProjectImages WHERE Id = ? AND ProjectId = ?`)
      .get(imageId, projectId);
    if (!target) {
      throw new NotFoundException('الصورة غير موجودة ضمن هذا المشروع.');
    }

    const txn = db.transaction(() => {
      db.prepare(`UPDATE ProjectImages SET IsCover = 0 WHERE ProjectId = ? AND IsCover = 1`).run(
        projectId,
      );
      db.prepare(`UPDATE ProjectImages SET IsCover = 1 WHERE Id = ? AND ProjectId = ?`).run(
        imageId,
        projectId,
      );
    });
    txn();
  },

  reorderImages(projectId: number, input: unknown): void {
    assertProjectExists(projectId);
    const dto = validateOrThrow(reorderImagesSchema, input);
    const db = getDb();

    const currentRows = db
      .prepare(`SELECT Id FROM ProjectImages WHERE ProjectId = ?`)
      .all(projectId) as Array<{ Id: number }>;

    const currentIds = new Set(currentRows.map((r) => r.Id));
    const uniqueSubmitted = new Set(dto.orderedImageIds);

    if (
      uniqueSubmitted.size !== dto.orderedImageIds.length ||
      uniqueSubmitted.size !== currentIds.size ||
      dto.orderedImageIds.some((id) => !currentIds.has(id))
    ) {
      throw new BadRequestException(
        'قائمة ترتيب الصور يجب أن تطابق جميع صور المشروع الحالية دون زيادة أو نقص أو تكرار.',
      );
    }

    const txn = db.transaction(() => {
      const stmt = db.prepare(
        `UPDATE ProjectImages SET DisplayOrder = ? WHERE Id = ? AND ProjectId = ?`,
      );
      dto.orderedImageIds.forEach((imgId, idx) => {
        stmt.run(idx, imgId, projectId);
      });
    });
    txn();
  },

  async deleteImage(projectId: number, imageId: number): Promise<void> {
    assertProjectExists(projectId);
    const db = getDb();

    const existing = db
      .prepare(`SELECT Id, FilePath, ThumbnailPath, IsCover FROM ProjectImages WHERE Id = ? AND ProjectId = ?`)
      .get(imageId, projectId) as
      | { Id: number; FilePath: string; ThumbnailPath: string; IsCover: number }
      | undefined;

    if (!existing) {
      throw new NotFoundException('الصورة غير موجودة ضمن هذا المشروع.');
    }

    const txn = db.transaction(() => {
      db.prepare(`DELETE FROM ProjectImages WHERE Id = ? AND ProjectId = ?`).run(imageId, projectId);

      if (existing.IsCover === 1) {
        const nextFirst = db
          .prepare(
            `SELECT Id FROM ProjectImages
             WHERE ProjectId = ?
             ORDER BY DisplayOrder ASC, Id ASC
             LIMIT 1`,
          )
          .get(projectId) as { Id: number } | undefined;

        if (nextFirst) {
          db.prepare(`UPDATE ProjectImages SET IsCover = 1 WHERE Id = ?`).run(nextFirst.Id);
        }
      }
    });
    txn();

    await deleteStoredFileSafe(existing.FilePath);
    await deleteStoredFileSafe(existing.ThumbnailPath);
  },
};
