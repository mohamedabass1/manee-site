import type {
  AdminCategory,
  AdminMaterial,
  AdminProjectDetails,
  AdminProjectImage,
  AdminProjectListItem,
  AdminService,
  AdminSiteSettings,
  AuthMe,
  ContactMessageItem,
  ImageStage,
  MessageStatus,
  PagedResult,
  ProblemDetails,
  ProjectStatus,
  PublicCategory,
  PublicMaterial,
  PublicProjectDetails,
  PublicProjectListItem,
  PublicService,
  PublicSiteSettings,
  SetupStatus,
} from '../types/api';

export class ApiError extends Error {
  public readonly status: number;
  public readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title || 'حدث خطأ أثناء الاتصال بالخادم.');
    this.status = problem.status;
    this.problem = problem;
  }
}

// Strictly in-memory JWT storage (never persisted in localStorage/sessionStorage)
let inMemoryAccessToken: string | null = null;
let inMemoryExpiresAtUtc: string | null = null;

export function setAuthToken(token: string | null, expiresAtUtc?: string | null): void {
  inMemoryAccessToken = token;
  inMemoryExpiresAtUtc = expiresAtUtc ?? null;
}

export function getAuthToken(): string | null {
  if (!inMemoryAccessToken) return null;
  if (inMemoryExpiresAtUtc && Date.parse(inMemoryExpiresAtUtc) <= Date.now()) {
    inMemoryAccessToken = null;
    inMemoryExpiresAtUtc = null;
    return null;
  }
  return inMemoryAccessToken;
}

export function extractIdFromSegment(segment: string): number | null {
  const match = segment.trim().match(/^(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function sanitizeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    formData?: FormData;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.auth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let fetchBody: BodyInit | undefined;
  if (options.formData) {
    fetchBody = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(options.body);
  }

  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: fetchBody,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('json');

  if (!res.ok) {
    if (isJson) {
      const problem = (await res.json()) as ProblemDetails;
      throw new ApiError({ ...problem, status: problem.status || res.status });
    }
    throw new ApiError({
      status: res.status,
      title: 'خطأ في الاستجابة',
      detail: 'تعذّر إتمام الطلب. يرجى المحاولة مجدداً.',
    });
  }

  return (isJson ? await res.json() : await res.text()) as T;
}

function toQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v));
    }
  }
  const str = sp.toString();
  return str ? `?${str}` : '';
}

export const api = {
  // ---- PUBLIC ----
  getPublicSiteSettings: () => request<PublicSiteSettings>('/api/v1/public/site-settings'),
  getPublicServices: () => request<PublicService[]>('/api/v1/public/services'),
  getPublicServiceById: (id: number) => request<PublicService>(`/api/v1/public/services/${id}`),
  getPublicCategories: () => request<PublicCategory[]>('/api/v1/public/categories'),
  getPublicMaterials: () => request<PublicMaterial[]>('/api/v1/public/materials'),
  getPublicProjects: (params: {
    page?: number;
    pageSize?: number;
    categoryId?: number | null;
    serviceId?: number | null;
    materialId?: number | null;
    status?: ProjectStatus | '';
    featured?: boolean;
    search?: string;
  }) =>
    request<PagedResult<PublicProjectListItem>>(
      `/api/v1/public/projects${toQueryString(params)}`,
    ),
  getPublicProjectById: (id: number) =>
    request<PublicProjectDetails>(`/api/v1/public/projects/${id}`),
  submitContactMessage: (payload: {
    fullName: string;
    phone: string;
    email?: string;
    subject?: string;
    message: string;
    website?: string;
  }) =>
    request<{ id: number; message: string }>('/api/v1/public/contact-messages', {
      method: 'POST',
      body: payload,
    }),

  // ---- AUTH ----
  getAuthSetupStatus: () => request<SetupStatus>('/api/v1/auth/setup-status'),
  bootstrapAdmin: (payload: { username: string; fullName: string; password: string }) =>
    request<{ accessToken: string; expiresAtUtc: string }>('/api/v1/auth/bootstrap', {
      method: 'POST',
      body: payload,
    }),
  login: (payload: { username: string; password: string }) =>
    request<{ accessToken: string; expiresAtUtc: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: payload,
    }),
  getMe: () => request<AuthMe>('/api/v1/auth/me', { auth: true }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<void>('/api/v1/auth/change-password', {
      method: 'POST',
      body: payload,
      auth: true,
    }),

  // ---- ADMIN PROJECTS ----
  getAdminProjects: (params: {
    page?: number;
    pageSize?: number;
    categoryId?: number | null;
    status?: ProjectStatus | '';
    isPublished?: boolean | '';
    search?: string;
  }) =>
    request<PagedResult<AdminProjectListItem>>(
      `/api/v1/admin/projects${toQueryString(params)}`,
      { auth: true },
    ),
  getAdminProjectById: (id: number) =>
    request<AdminProjectDetails>(`/api/v1/admin/projects/${id}`, { auth: true }),
  createProject: (payload: Record<string, unknown>) =>
    request<AdminProjectDetails>('/api/v1/admin/projects', {
      method: 'POST',
      body: payload,
      auth: true,
    }),
  updateProject: (id: number, payload: Record<string, unknown>) =>
    request<AdminProjectDetails>(`/api/v1/admin/projects/${id}`, {
      method: 'PUT',
      body: payload,
      auth: true,
    }),
  toggleProjectPublish: (id: number, isPublished: boolean) =>
    request<void>(`/api/v1/admin/projects/${id}/publish`, {
      method: 'PATCH',
      body: { isPublished },
      auth: true,
    }),
  deleteProject: (id: number) =>
    request<void>(`/api/v1/admin/projects/${id}`, {
      method: 'DELETE',
      auth: true,
    }),

  // ---- ADMIN PROJECT IMAGES ----
  uploadProjectImages: (
    projectId: number,
    files: File[],
    stage: ImageStage,
    altText?: string,
  ) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    fd.append('stage', stage);
    if (altText && altText.trim()) fd.append('altText', altText.trim());
    return request<AdminProjectImage[]>(`/api/v1/admin/projects/${projectId}/images`, {
      method: 'POST',
      formData: fd,
      auth: true,
    });
  },
  updateImageMetadata: (
    projectId: number,
    imageId: number,
    payload: { altText: string | null; stage: ImageStage },
  ) =>
    request<AdminProjectImage>(`/api/v1/admin/projects/${projectId}/images/${imageId}`, {
      method: 'PUT',
      body: payload,
      auth: true,
    }),
  replaceImageFile: (projectId: number, imageId: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<AdminProjectImage>(`/api/v1/admin/projects/${projectId}/images/${imageId}/file`, {
      method: 'PUT',
      formData: fd,
      auth: true,
    });
  },
  setCoverImage: (projectId: number, imageId: number) =>
    request<void>(`/api/v1/admin/projects/${projectId}/images/${imageId}/cover`, {
      method: 'PUT',
      auth: true,
    }),
  reorderImages: (projectId: number, orderedImageIds: number[]) =>
    request<void>(`/api/v1/admin/projects/${projectId}/images/order`, {
      method: 'PUT',
      body: { orderedImageIds },
      auth: true,
    }),
  deleteProjectImage: (projectId: number, imageId: number) =>
    request<void>(`/api/v1/admin/projects/${projectId}/images/${imageId}`, {
      method: 'DELETE',
      auth: true,
    }),

  // ---- ADMIN LOOKUPS ----
  getAdminCategories: () => request<AdminCategory[]>('/api/v1/admin/categories', { auth: true }),
  createCategory: (payload: { name: string; displayOrder: number; isActive: boolean }) =>
    request<AdminCategory>('/api/v1/admin/categories', {
      method: 'POST',
      body: payload,
      auth: true,
    }),
  updateCategory: (id: number, payload: { name: string; displayOrder: number; isActive: boolean }) =>
    request<AdminCategory>(`/api/v1/admin/categories/${id}`, {
      method: 'PUT',
      body: payload,
      auth: true,
    }),
  deleteCategory: (id: number) =>
    request<void>(`/api/v1/admin/categories/${id}`, { method: 'DELETE', auth: true }),

  getAdminServices: () => request<AdminService[]>('/api/v1/admin/services', { auth: true }),
  createService: (payload: {
    name: string;
    slug?: string | null;
    shortDescription: string;
    description?: string | null;
    displayOrder: number;
    isActive: boolean;
  }) =>
    request<AdminService>('/api/v1/admin/services', {
      method: 'POST',
      body: payload,
      auth: true,
    }),
  updateService: (
    id: number,
    payload: {
      name: string;
      slug?: string | null;
      shortDescription: string;
      description?: string | null;
      displayOrder: number;
      isActive: boolean;
    },
  ) =>
    request<AdminService>(`/api/v1/admin/services/${id}`, {
      method: 'PUT',
      body: payload,
      auth: true,
    }),
  deleteService: (id: number) =>
    request<void>(`/api/v1/admin/services/${id}`, { method: 'DELETE', auth: true }),

  getAdminMaterials: () => request<AdminMaterial[]>('/api/v1/admin/materials', { auth: true }),
  createMaterial: (payload: { name: string; isActive: boolean }) =>
    request<AdminMaterial>('/api/v1/admin/materials', {
      method: 'POST',
      body: payload,
      auth: true,
    }),
  updateMaterial: (id: number, payload: { name: string; isActive: boolean }) =>
    request<AdminMaterial>(`/api/v1/admin/materials/${id}`, {
      method: 'PUT',
      body: payload,
      auth: true,
    }),
  deleteMaterial: (id: number) =>
    request<void>(`/api/v1/admin/materials/${id}`, { method: 'DELETE', auth: true }),

  // ---- ADMIN CONTACT MESSAGES ----
  getAdminMessages: (params: { page?: number; pageSize?: number; status?: MessageStatus | '' }) =>
    request<PagedResult<ContactMessageItem>>(
      `/api/v1/admin/contact-messages${toQueryString(params)}`,
      { auth: true },
    ),
  getUnreadMessageCount: () =>
    request<{ count: number }>('/api/v1/admin/contact-messages/unread-count', { auth: true }),
  getAdminMessageById: (id: number) =>
    request<ContactMessageItem>(`/api/v1/admin/contact-messages/${id}`, { auth: true }),
  updateMessageStatus: (id: number, status: MessageStatus) =>
    request<void>(`/api/v1/admin/contact-messages/${id}/status`, {
      method: 'PATCH',
      body: { status },
      auth: true,
    }),
  deleteMessage: (id: number) =>
    request<void>(`/api/v1/admin/contact-messages/${id}`, { method: 'DELETE', auth: true }),

  // ---- ADMIN SITE SETTINGS ----
  getAdminSiteSettings: () => request<AdminSiteSettings>('/api/v1/admin/site-settings', { auth: true }),
  updateAdminSiteSettings: (payload: Record<string, unknown>) =>
    request<AdminSiteSettings>('/api/v1/admin/site-settings', {
      method: 'PUT',
      body: payload,
      auth: true,
    }),

  // ---- HEALTH ----
  getHealth: () =>
    request<{
      status: string;
      checks: { database: string; storage: string };
      timestampUtc: string;
    }>('/health'),
};
