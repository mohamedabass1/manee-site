import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';
import { adminUploadRateLimiter } from '../middleware/rateLimit.ts';
import { projectService } from '../services/projectService.ts';
import { imageService } from '../services/imageService.ts';
import { lookupService } from '../services/lookupService.ts';
import { contactService } from '../services/contactService.ts';
import { siteSettingsService } from '../services/siteSettingsService.ts';
import { BadRequestException } from '../domain/errors.ts';

export const adminRouter = Router();

adminRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxFileSizeMb * 1024 * 1024,
    files: config.storage.maxFilesPerRequest,
  },
});

function parseId(raw: string, label: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new BadRequestException(`معرّف ${label} غير صالح.`);
  }
  return n;
}

// ---- PROJECTS ----
adminRouter.get('/projects', (req, res, next) => {
  try {
    res.json(projectService.getAdminProjects(req.query as Record<string, unknown>));
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/projects/:id', (req, res, next) => {
  try {
    res.json(projectService.getAdminProjectById(parseId(req.params.id, 'المشروع')));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/projects', (req, res, next) => {
  try {
    const created = projectService.createProject(req.body);
    res.status(201).location(`/api/v1/admin/projects/${created.id}`).json(created);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/projects/:id', (req, res, next) => {
  try {
    const updated = projectService.updateProject(parseId(req.params.id, 'المشروع'), req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/projects/:id/publish', (req, res, next) => {
  try {
    projectService.setPublishStatus(parseId(req.params.id, 'المشروع'), req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/projects/:id', (req, res, next) => {
  try {
    projectService.softDeleteProject(parseId(req.params.id, 'المشروع'));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---- PROJECT IMAGES ----
adminRouter.post(
  '/projects/:projectId/images',
  adminUploadRateLimiter,
  upload.array('files', config.storage.maxFilesPerRequest),
  async (req, res, next) => {
    try {
      const projectId = parseId(req.params.projectId, 'المشروع');
      const files = (req.files as Express.Multer.File[]) || [];
      const created = await imageService.uploadImages(
        projectId,
        files,
        req.body?.stage,
        req.body?.altText,
      );
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.put('/projects/:projectId/images/order', (req, res, next) => {
  try {
    const projectId = parseId(req.params.projectId, 'المشروع');
    imageService.reorderImages(projectId, req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/projects/:projectId/images/:imageId', (req, res, next) => {
  try {
    const projectId = parseId(req.params.projectId, 'المشروع');
    const imageId = parseId(req.params.imageId, 'الصورة');
    res.json(imageService.updateImageMetadata(projectId, imageId, req.body));
  } catch (err) {
    next(err);
  }
});

adminRouter.put(
  '/projects/:projectId/images/:imageId/file',
  adminUploadRateLimiter,
  upload.single('file'),
  async (req, res, next) => {
    try {
      const projectId = parseId(req.params.projectId, 'المشروع');
      const imageId = parseId(req.params.imageId, 'الصورة');
      const updated = await imageService.replaceImageFile(projectId, imageId, req.file);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.put('/projects/:projectId/images/:imageId/cover', (req, res, next) => {
  try {
    const projectId = parseId(req.params.projectId, 'المشروع');
    const imageId = parseId(req.params.imageId, 'الصورة');
    imageService.setCoverImage(projectId, imageId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/projects/:projectId/images/:imageId', async (req, res, next) => {
  try {
    const projectId = parseId(req.params.projectId, 'المشروع');
    const imageId = parseId(req.params.imageId, 'الصورة');
    await imageService.deleteImage(projectId, imageId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---- CATEGORIES ----
adminRouter.get('/categories', (_req, res, next) => {
  try {
    res.json(lookupService.getAdminCategories());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/categories/:id', (req, res, next) => {
  try {
    res.json(lookupService.getAdminCategoryById(parseId(req.params.id, 'التصنيف')));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/categories', (req, res, next) => {
  try {
    const created = lookupService.createCategory(req.body);
    res.status(201).location(`/api/v1/admin/categories/${created.id}`).json(created);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/categories/:id', (req, res, next) => {
  try {
    res.json(lookupService.updateCategory(parseId(req.params.id, 'التصنيف'), req.body));
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/categories/:id', (req, res, next) => {
  try {
    lookupService.deleteCategory(parseId(req.params.id, 'التصنيف'));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---- SERVICES ----
adminRouter.get('/services', (_req, res, next) => {
  try {
    res.json(lookupService.getAdminServices());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/services/:id', (req, res, next) => {
  try {
    res.json(lookupService.getAdminServiceById(parseId(req.params.id, 'الخدمة')));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/services', (req, res, next) => {
  try {
    const created = lookupService.createService(req.body);
    res.status(201).location(`/api/v1/admin/services/${created.id}`).json(created);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/services/:id', (req, res, next) => {
  try {
    res.json(lookupService.updateService(parseId(req.params.id, 'الخدمة'), req.body));
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/services/:id', (req, res, next) => {
  try {
    lookupService.deleteService(parseId(req.params.id, 'الخدمة'));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---- MATERIALS ----
adminRouter.get('/materials', (_req, res, next) => {
  try {
    res.json(lookupService.getAdminMaterials());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/materials/:id', (req, res, next) => {
  try {
    res.json(lookupService.getAdminMaterialById(parseId(req.params.id, 'المادة')));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/materials', (req, res, next) => {
  try {
    const created = lookupService.createMaterial(req.body);
    res.status(201).location(`/api/v1/admin/materials/${created.id}`).json(created);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/materials/:id', (req, res, next) => {
  try {
    res.json(lookupService.updateMaterial(parseId(req.params.id, 'المادة'), req.body));
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/materials/:id', (req, res, next) => {
  try {
    lookupService.deleteMaterial(parseId(req.params.id, 'المادة'));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---- CONTACT MESSAGES ----
adminRouter.get('/contact-messages/unread-count', (_req, res, next) => {
  try {
    res.json(contactService.getUnreadCount());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/contact-messages', (req, res, next) => {
  try {
    res.json(contactService.getAdminMessages(req.query as Record<string, unknown>));
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/contact-messages/:id', (req, res, next) => {
  try {
    res.json(contactService.getAdminMessageById(parseId(req.params.id, 'الرسالة')));
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/contact-messages/:id/status', (req, res, next) => {
  try {
    contactService.updateMessageStatus(parseId(req.params.id, 'الرسالة'), req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/contact-messages/:id', (req, res, next) => {
  try {
    contactService.deleteMessage(parseId(req.params.id, 'الرسالة'));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---- SITE SETTINGS ----
adminRouter.get('/site-settings', (_req, res, next) => {
  try {
    res.json(siteSettingsService.getAdminSettings());
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/site-settings', (req, res, next) => {
  try {
    res.json(siteSettingsService.updateAdminSettings(req.body));
  } catch (err) {
    next(err);
  }
});
