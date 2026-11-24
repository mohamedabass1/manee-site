export type ProjectStatus = 'Planned' | 'InProgress' | 'Completed';
export type ImageStage = 'General' | 'Before' | 'During' | 'After';
export type MessageStatus = 'New' | 'Read' | 'Handled';
export type EmailNotificationStatus = 'Pending' | 'Sent' | 'Failed';

export const PROJECT_STATUS_AR: Record<ProjectStatus, string> = {
  Planned: 'مخطط للتنفيذ',
  InProgress: 'قيد التنفيذ',
  Completed: 'مكتمل',
};

export const IMAGE_STAGE_AR: Record<ImageStage, string> = {
  General: 'عام',
  Before: 'قبل التنفيذ',
  During: 'أثناء التنفيذ',
  After: 'بعد التنفيذ',
};

export const MESSAGE_STATUS_AR: Record<MessageStatus, string> = {
  New: 'جديدة',
  Read: 'مقروءة',
  Handled: 'تمت المعالجة',
};

export const NOTIFICATION_STATUS_AR: Record<EmailNotificationStatus, string> = {
  Pending: 'بانتظار الإرسال',
  Sent: 'تم الإرسال',
  Failed: 'تعذّر الإرسال',
};

export interface ProblemDetails {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PublicSiteSettings {
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

export interface AdminSiteSettings extends PublicSiteSettings {
  notificationEmail: string | null;
}

export interface PublicCategory {
  id: number;
  name: string;
  displayOrder: number;
}

export interface AdminCategory extends PublicCategory {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicService {
  id: number;
  urlSegment: string;
  name: string;
  shortDescription: string;
  description?: string | null;
  displayOrder: number;
}

export interface AdminService {
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

export interface PublicMaterial {
  id: number;
  name: string;
}

export interface AdminMaterial extends PublicMaterial {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoverImage {
  url: string;
  thumbnailUrl: string;
  altText: string | null;
}

export interface PublicProjectListItem {
  id: number;
  urlSegment: string;
  title: string;
  shortDescription: string;
  category: { id: number; name: string };
  status: ProjectStatus;
  city: string | null;
  executionDate: string | null;
  coverImage: CoverImage | null;
  isFeatured: boolean;
}

export interface PublicProjectImage {
  id: number;
  url: string;
  thumbnailUrl: string;
  altText: string | null;
  stage: ImageStage;
  isCover: boolean;
  displayOrder: number;
}

export interface PublicProjectDetails extends PublicProjectListItem {
  description: string;
  areaInSquareMeters: number | null;
  durationInDays: number | null;
  services: Array<{ id: number; name: string; urlSegment: string }>;
  materials: Array<{ id: number; name: string }>;
  images: PublicProjectImage[];
}

export interface AdminProjectImage extends PublicProjectImage {
  originalFileName: string;
  contentType: string;
  sizeInBytes: number;
  width: number;
  height: number;
  createdAt: string;
}

export interface AdminProjectListItem {
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
  coverImage: CoverImage | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProjectDetails extends AdminProjectListItem {
  slug: string | null;
  description: string;
  categoryId: number;
  areaInSquareMeters: number | null;
  durationInDays: number | null;
  serviceIds: number[];
  materialIds: number[];
  services: Array<{ id: number; name: string }>;
  materials: Array<{ id: number; name: string }>;
  images: AdminProjectImage[];
}

export interface ContactMessageItem {
  id: number;
  fullName: string;
  phone: string;
  email: string | null;
  subject: string | null;
  message: string;
  status: MessageStatus;
  notificationStatus: EmailNotificationStatus;
  ipAddress: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface AuthMe {
  username: string;
  fullName: string | null;
}

export interface SetupStatus {
  needsSetup: boolean;
  envPasswordConfigured: boolean;
}
