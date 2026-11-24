import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp, { type Metadata, type OutputInfo } from 'sharp';
import { config } from './config.ts';
import { BadRequestError } from './errors.ts';

export type DetectedImageFormat = 'jpeg' | 'png' | 'webp';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_DIMENSION = 12000;
const RESIZE_MAX_EDGE = 2000;
const THUMB_WIDTH = 480;

export interface ProcessedImageResult {
  filePath: string;
  thumbnailPath: string;
  originalFileName: string;
  contentType: string;
  sizeInBytes: number;
  width: number;
  height: number;
}

export function ensureStorageRoot(): void {
  fs.mkdirSync(config.storage.rootPath, { recursive: true });
}

/**
 * Resolves a relative storage path and guarantees it cannot escape Storage:RootPath.
 */
export function resolveConfinedPath(relativePath: string): string {
  const normalizedRel = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const rootResolved = path.resolve(config.storage.rootPath);
  const fullPath = path.resolve(rootResolved, normalizedRel);
  if (fullPath !== rootResolved && !fullPath.startsWith(rootResolved + path.sep)) {
    throw new BadRequestError('مسار الملف غير مسموح به.');
  }
  return fullPath;
}

export function sanitizeOriginalFileName(rawName: string | undefined): string {
  const base = path.basename((rawName || 'image').replace(/\\/g, '/'));
  const cleaned = base.replace(/[\x00-\x1f<>:"|?*]/g, '_').trim();
  return (cleaned || 'image').slice(0, 260);
}

/**
 * Inspects actual Magic Bytes (never trusts client MIME type or filename alone).
 */
export function detectFormatByMagicBytes(buf: Buffer): DetectedImageFormat | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

export async function saveBuffer(relativePath: string, data: Buffer): Promise<void> {
  const fullPath = resolveConfinedPath(relativePath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, data);
}

export async function deleteFileSafe(relativePath: string): Promise<void> {
  try {
    const fullPath = resolveConfinedPath(relativePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (err) {
    console.warn(`[Storage] تعذر حذف الملف ${relativePath}:`, (err as Error).message);
  }
}

export function toPublicUploadUrl(relativePath: string): string {
  const clean = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `/uploads/${clean}`;
}

/**
 * Full SOP Section 11 image processing pipeline:
 * 1. Empty / size <= 8MB check
 * 2. Allowed extension check (.jpg .jpeg .png .webp)
 * 3. Magic Bytes validation
 * 4. Sharp decode + decompression bomb dimension check (<= 12000x12000)
 * 5. Auto-Orient & strip all EXIF/GPS/metadata
 * 6. Resize longest side <= 2000px & re-encode quality 85
 * 7. Generate 480px WebP thumbnail quality 75
 * 8. Server-generated UUID filename
 * 9. Atomic save to disk with rollback on failure
 */
export async function processAndSaveProjectImage(
  buffer: Buffer,
  originalFileName: string,
  projectId: number
): Promise<ProcessedImageResult> {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestError('الملف المرفوع فارغ.');
  }

  if (buffer.length > config.storage.maxFileSizeMb * 1024 * 1024) {
    throw new BadRequestError(
      `حجم الملف يتجاوز الحد الأقصى المسموح (${config.storage.maxFileSizeMb} ميجابايت).`
    );
  }

  const sanitizedName = sanitizeOriginalFileName(originalFileName);
  const ext = path.extname(sanitizedName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new BadRequestError(
      'امتداد الملف غير مدعوم. الصيغ المسموحة فقط: JPG وJPEG وPNG وWebP.'
    );
  }

  const detected = detectFormatByMagicBytes(buffer);
  if (!detected) {
    throw new BadRequestError(
      'محتوى الملف لا يطابق صورة صالحة (JPG أو PNG أو WebP).'
    );
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: MAX_DIMENSION * MAX_DIMENSION }).metadata();
  } catch {
    throw new BadRequestError('تعذر قراءة ملف الصورة. تأكد من أن الملف غير تالف.');
  }

  if (!metadata.width || !metadata.height) {
    throw new BadRequestError('تعذر قراءة أبعاد الصورة.');
  }

  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    throw new BadRequestError(
      `أبعاد الصورة تتجاوز الحد الأقصى المسموح (${MAX_DIMENSION}×${MAX_DIMENSION} بكسل).`
    );
  }

  // Step 5 & 6: Auto-orient, strip EXIF/metadata (sharp omits metadata by default), resize max 2000px, re-encode
  let mainPipeline = sharp(buffer, { limitInputPixels: MAX_DIMENSION * MAX_DIMENSION })
    .rotate()
    .resize({
      width: RESIZE_MAX_EDGE,
      height: RESIZE_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    });

  let outExt: string;
  let contentType: string;

  if (detected === 'jpeg') {
    mainPipeline = mainPipeline.jpeg({ quality: 85, mozjpeg: true });
    outExt = 'jpg';
    contentType = 'image/jpeg';
  } else if (detected === 'png') {
    mainPipeline = mainPipeline.png({ compressionLevel: 8 });
    outExt = 'png';
    contentType = 'image/png';
  } else {
    mainPipeline = mainPipeline.webp({ quality: 85 });
    outExt = 'webp';
    contentType = 'image/webp';
  }

  let mainResult: { data: Buffer; info: OutputInfo };
  let thumbBuffer: Buffer;
  try {
    mainResult = await mainPipeline.toBuffer({ resolveWithObject: true });
    // Step 7: 480px WebP thumbnail, quality 75, EXIF stripped
    thumbBuffer = await sharp(mainResult.data)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
  } catch {
    throw new BadRequestError('فشلت معالجة الصورة. يرجى المحاولة بصورة أخرى.');
  }

  const fileId = crypto.randomUUID();
  const filePath = `projects/${projectId}/${fileId}.${outExt}`;
  const thumbnailPath = `projects/${projectId}/${fileId}_thumb.webp`;

  try {
    await saveBuffer(filePath, mainResult.data);
    await saveBuffer(thumbnailPath, thumbBuffer);
  } catch (err) {
    await deleteFileSafe(filePath);
    await deleteFileSafe(thumbnailPath);
    throw err;
  }

  return {
    filePath,
    thumbnailPath,
    originalFileName: sanitizedName,
    contentType,
    sizeInBytes: mainResult.info.size,
    width: mainResult.info.width,
    height: mainResult.info.height,
  };
}

export async function checkStorageWritable(): Promise<boolean> {
  try {
    ensureStorageRoot();
    const probeFile = resolveConfinedPath(`.health_${crypto.randomUUID()}.tmp`);
    await fs.promises.writeFile(probeFile, 'ok');
    await fs.promises.unlink(probeFile);
    return true;
  } catch {
    return false;
  }
}
