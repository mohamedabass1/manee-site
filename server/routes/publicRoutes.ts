import { Router } from 'express';
import { siteSettingsService } from '../services/siteSettingsService.ts';
import { lookupService } from '../services/lookupService.ts';
import { projectService } from '../services/projectService.ts';
import { contactService } from '../services/contactService.ts';
import { contactRateLimiter, publicApiRateLimiter } from '../middleware/rateLimit.ts';
import { BadRequestException } from '../domain/errors.ts';

export const publicRouter = Router();

function parsePositiveId(raw: string, label: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new BadRequestException(`معرّف ${label} يجب أن يكون رقماً صحيحاً موجباً.`);
  }
  return n;
}

publicRouter.use(publicApiRateLimiter);

publicRouter.get('/site-settings', (_req, res, next) => {
  try {
    res.json(siteSettingsService.getPublicSettings());
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/services', (_req, res, next) => {
  try {
    res.json(lookupService.getPublicServices());
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/services/:id', (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id, 'الخدمة');
    res.json(lookupService.getPublicServiceById(id));
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/categories', (_req, res, next) => {
  try {
    res.json(lookupService.getPublicCategories());
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/materials', (_req, res, next) => {
  try {
    res.json(lookupService.getPublicMaterials());
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/projects', (req, res, next) => {
  try {
    res.json(projectService.getPublicProjects(req.query as Record<string, unknown>));
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/projects/:id', (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id, 'المشروع');
    res.json(projectService.getPublicProjectById(id));
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/contact-messages', contactRateLimiter, (req, res, next) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || null;
    const result = contactService.submitPublicMessage(req.body, ip);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
