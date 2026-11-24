export enum ProjectStatus {
  Planned = 'Planned',
  InProgress = 'InProgress',
  Completed = 'Completed',
}

export enum ImageStage {
  General = 'General',
  Before = 'Before',
  During = 'During',
  After = 'After',
}

export enum MessageStatus {
  New = 'New',
  Read = 'Read',
  Handled = 'Handled',
}

export enum EmailNotificationStatus {
  Pending = 'Pending',
  Sent = 'Sent',
  Failed = 'Failed',
}

export const ProjectStatusToInt: Record<ProjectStatus, number> = {
  [ProjectStatus.Planned]: 0,
  [ProjectStatus.InProgress]: 1,
  [ProjectStatus.Completed]: 2,
};

export const IntToProjectStatus: Record<number, ProjectStatus> = {
  0: ProjectStatus.Planned,
  1: ProjectStatus.InProgress,
  2: ProjectStatus.Completed,
};

export const ImageStageToInt: Record<ImageStage, number> = {
  [ImageStage.General]: 0,
  [ImageStage.Before]: 1,
  [ImageStage.During]: 2,
  [ImageStage.After]: 3,
};

export const IntToImageStage: Record<number, ImageStage> = {
  0: ImageStage.General,
  1: ImageStage.Before,
  2: ImageStage.During,
  3: ImageStage.After,
};

export const MessageStatusToInt: Record<MessageStatus, number> = {
  [MessageStatus.New]: 0,
  [MessageStatus.Read]: 1,
  [MessageStatus.Handled]: 2,
};

export const IntToMessageStatus: Record<number, MessageStatus> = {
  0: MessageStatus.New,
  1: MessageStatus.Read,
  2: MessageStatus.Handled,
};

export const EmailNotificationStatusToInt: Record<EmailNotificationStatus, number> = {
  [EmailNotificationStatus.Pending]: 0,
  [EmailNotificationStatus.Sent]: 1,
  [EmailNotificationStatus.Failed]: 2,
};

export const IntToEmailNotificationStatus: Record<number, EmailNotificationStatus> = {
  0: EmailNotificationStatus.Pending,
  1: EmailNotificationStatus.Sent,
  2: EmailNotificationStatus.Failed,
};

export function buildUrlSegment(id: number, slug: string | null | undefined): string {
  return slug && slug.trim().length > 0 ? `${id}-${slug.trim()}` : `${id}`;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
