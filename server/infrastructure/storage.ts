import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp, { type Metadata, type OutputInfo } from 'sharp';
import { config } from '../config.ts';
import { BadRequestException } from '../domain/errors.ts';

export interface ProcessedImageResult {
  filePath: string;
  thumbnailPath: string;
  contentType: string;
  sizeInBytes: number;
  width: number;
  height: number;
  originalFileName: string;
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_DIMENSION = 12000;
const MAX_OUTPUT_SIDE = 2000;
const THUMB_WIDTH = 480;

type DetectedFormat = 'jpeg' | 'png' | 'webp';

export function detectImageMagicBytes(buffer: Buffer): DetectedFormat | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

export function sanitizeOriginalFileName(rawName: string): string {
  const base = path.basename(rawName || 'image.jpg').replace(/[^\w.\-\u0600-\u06FF ]+/g, '_').trim();
  const safe = base.length > 0 ? base : 'image.jpg';
  return safe.slice(0, 260);
}

export function resolveSafeStoragePath(relativePath: string): string {
  const rootDir = path.resolve(config.storage.rootPath);
  const normalizedRel = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const resolved = path.resolve(rootDir, normalizedRel);
  if (!resolved.startsWith(rootDir + path.sep)) {
    throw new BadRequestException('مسار الملف غير مسموح به.');
  }
  return resolved;
}

export function ensureStorageRoot(): void {
  const rootDir = path.resolve(config.storage.rootPath);
  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true });
  }
}

export function checkStorageWritable(): boolean {
  try {
    ensureStorageRoot();
    const probePath = resolveSafeStoragePath(`.health_${crypto.randomUUID()}.tmp`);
    fs.writeFileSync(probePath, 'ok');
    fs.unlinkSync(probePath);
    return true;
  } catch {
    return false;
  }
}

export async function processAndSaveProjectImage(
  projectId: number,
  buffer: Buffer,
  originalName: string,
): Promise<ProcessedImageResult> {
  const maxBytes = config.storage.maxFileSizeMb * 1024 * 1024;
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('الملف المرفوع فارغ.');
  }
  if (buffer.length > maxBytes) {
    throw new BadRequestException(
      `حجم الصورة يتجاوز الحد الأقصى المسموح (${config.storage.maxFileSizeMb} ميجابايت).`,
    );
  }

  const ext = path.extname(originalName || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new BadRequestException('امتداد الصورة غير مدعوم. الامتدادات المسموحة: jpg, jpeg, png, webp.');
  }

  const detected = detectImageMagicBytes(buffer);
  if (!detected) {
    throw new BadRequestException('محتوى الملف لا يطابق صورة صالحة (فشل التحقق من توقيع الملف).');
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: MAX_DIMENSION * MAX_DIMENSION }).metadata();
  } catch {
    throw new BadRequestException('تعذّر قراءة الصورة. يرجى التأكد من سلامة الملف.');
  }

  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > MAX_DIMENSION ||
    metadata.height > MAX_DIMENSION
  ) {
    throw new BadRequestException('أبعاد الصورة غير صالحة أو تتجاوز الحد الأقصى المسموح (12000×12000).');
  }

  // Auto-orient and strip all EXIF/metadata by not calling withMetadata()
  const basePipeline = sharp(buffer)
    .rotate()
    .resize({
      width: MAX_OUTPUT_SIDE,
      height: MAX_OUTPUT_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    });

  let mainOutput: { data: Buffer; info: OutputInfo };
  let outExt: string;
  let contentType: string;

  if (detected === 'png') {
    mainOutput = await basePipeline.png({ compressionLevel: 8 }).toBuffer({ resolveWithObject: true });
    outExt = 'png';
    contentType = 'image/png';
  } else if (detected === 'webp') {
    mainOutput = await basePipeline.webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
    outExt = 'webp';
    contentType = 'image/webp';
  } else {
    mainOutput = await basePipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    outExt = 'jpg';
    contentType = 'image/jpeg';
  }

  const thumbBuffer = await sharp(mainOutput.data)
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  const fileId = crypto.randomUUID();
  const relMain = `projects/${projectId}/${fileId}.${outExt}`;
  const relThumb = `projects/${projectId}/${fileId}_thumb.webp`;

  const absMain = resolveSafeStoragePath(relMain);
  const absThumb = resolveSafeStoragePath(relThumb);

  ensureStorageRoot();
  fs.mkdirSync(path.dirname(absMain), { recursive: true });

  try {
    fs.writeFileSync(absMain, mainOutput.data);
    fs.writeFileSync(absThumb, thumbBuffer);
  } catch (err) {
    await deleteStoredFileSafe(relMain);
    await deleteStoredFileSafe(relThumb);
    throw err;
  }

  return {
    filePath: relMain,
    thumbnailPath: relThumb,
    contentType,
    sizeInBytes: mainOutput.data.length,
    width: mainOutput.info.width,
    height: mainOutput.info.height,
    originalFileName: sanitizeOriginalFileName(originalName),
  };
}

export async function deleteStoredFileSafe(relativePath: string): Promise<void> {
  try {
    const abs = resolveSafeStoragePath(relativePath);
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
    }
  } catch (err) {
    console.warn(`[Storage] تحذير: تعذّر حذف الملف ${relativePath}:`, (err as Error).message);
  }
}

export function buildPublicUploadUrl(relativePath: string): string {
  return `/uploads/${relativePath.replace(/^\/+/, '')}`;
}
