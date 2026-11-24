import { getDb } from '../infrastructure/db.ts';
import { emailQueue } from '../infrastructure/email.ts';
import {
  EmailNotificationStatus,
  EmailNotificationStatusToInt,
  IntToEmailNotificationStatus,
  IntToMessageStatus,
  MessageStatus,
  MessageStatusToInt,
  PagedResult,
} from '../domain/types.ts';
import { BadRequestException, NotFoundException } from '../domain/errors.ts';
import {
  createContactMessageSchema,
  updateMessageStatusSchema,
  validateOrThrow,
} from '../validation/schemas.ts';

export interface ContactMessageDto {
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

function mapMessageRow(r: any): ContactMessageDto {
  return {
    id: r.Id,
    fullName: r.FullName,
    phone: r.Phone,
    email: r.Email,
    subject: r.Subject,
    message: r.Message,
    status: IntToMessageStatus[r.Status] ?? MessageStatus.New,
    notificationStatus:
      IntToEmailNotificationStatus[r.NotificationStatus] ?? EmailNotificationStatus.Pending,
    ipAddress: r.IpAddress,
    createdAt: r.CreatedAt,
    readAt: r.ReadAt,
  };
}

export const contactService = {
  submitPublicMessage(
    input: unknown,
    ipAddress: string | null,
  ): { id: number; message: string } {
    // Honeypot check before saving: if 'website' is filled, return fake 201 without saving or notifying
    if (
      input &&
      typeof input === 'object' &&
      'website' in input &&
      typeof (input as any).website === 'string' &&
      (input as any).website.trim().length > 0
    ) {
      return {
        id: 0,
        message: 'تم استلام رسالتك بنجاح. سنتواصل معك في أقرب وقت.',
      };
    }

    const dto = validateOrThrow(createContactMessageSchema, input);
    const db = getDb();
    const now = new Date().toISOString();

    const result = db
      .prepare(
        `INSERT INTO ContactMessages (
           FullName, Phone, Email, Subject, Message, Status, NotificationStatus, IpAddress, CreatedAt
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        dto.fullName,
        dto.phone,
        dto.email,
        dto.subject,
        dto.message,
        MessageStatusToInt[MessageStatus.New],
        EmailNotificationStatusToInt[EmailNotificationStatus.Pending],
        ipAddress ? ipAddress.slice(0, 45) : null,
        now,
      );

    const messageId = Number(result.lastInsertRowid);
    // Fire-and-forget async email queue; failure never affects 201 response
    emailQueue.enqueue(messageId);

    return {
      id: messageId,
      message: 'تم استلام استفسارك بنجاح. سيتواصل معك فريق مَنيع قريباً.',
    };
  },

  getAdminMessages(query: Record<string, unknown>): PagedResult<ContactMessageDto> {
    const page = query.page === undefined || query.page === '' ? 1 : Number(query.page);
    const pageSize = query.pageSize === undefined || query.pageSize === '' ? 20 : Number(query.pageSize);

    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('رقم الصفحة غير صالح.');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
      throw new BadRequestException('حجم الصفحة يجب أن يكون بين 1 و50.');
    }

    const where: string[] = [];
    const params: unknown[] = [];

    if (query.status !== undefined && query.status !== null && query.status !== '') {
      const s = String(query.status) as MessageStatus;
      if (!(s in MessageStatusToInt)) {
        throw new BadRequestException('حالة الرسالة غير صالحة.');
      }
      where.push('Status = ?');
      params.push(MessageStatusToInt[s]);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const db = getDb();

    const totalRow = db
      .prepare(`SELECT COUNT(*) AS total FROM ContactMessages ${whereSql}`)
      .get(...params) as { total: number };

    const totalCount = totalRow.total;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
    const offset = (page - 1) * pageSize;

    const rows = db
      .prepare(
        `SELECT * FROM ContactMessages
         ${whereSql}
         ORDER BY CreatedAt DESC, Id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, offset) as any[];

    return {
      items: rows.map(mapMessageRow),
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  },

  getUnreadCount(): { count: number } {
    const db = getDb();
    const row = db
      .prepare(`SELECT COUNT(*) AS cnt FROM ContactMessages WHERE Status = ?`)
      .get(MessageStatusToInt[MessageStatus.New]) as { cnt: number };
    return { count: row.cnt };
  },

  getAdminMessageById(id: number): ContactMessageDto {
    const db = getDb();
    // Per SOP section 9.3: GET detail does NOT change status
    const row = db.prepare(`SELECT * FROM ContactMessages WHERE Id = ?`).get(id);
    if (!row) {
      throw new NotFoundException('الرسالة غير موجودة.');
    }
    return mapMessageRow(row);
  },

  updateMessageStatus(id: number, input: unknown): void {
    const dto = validateOrThrow(updateMessageStatusSchema, input);
    const db = getDb();

    const existing = db
      .prepare(`SELECT Id, ReadAt FROM ContactMessages WHERE Id = ?`)
      .get(id) as { Id: number; ReadAt: string | null } | undefined;

    if (!existing) {
      throw new NotFoundException('الرسالة غير موجودة.');
    }

    let readAt = existing.ReadAt;
    if (dto.status === MessageStatus.Read && !readAt) {
      readAt = new Date().toISOString();
    }

    db.prepare(`UPDATE ContactMessages SET Status = ?, ReadAt = ? WHERE Id = ?`).run(
      MessageStatusToInt[dto.status],
      readAt,
      id,
    );
  },

  deleteMessage(id: number): void {
    const db = getDb();
    const res = db.prepare(`DELETE FROM ContactMessages WHERE Id = ?`).run(id);
    if (res.changes === 0) {
      throw new NotFoundException('الرسالة غير موجودة.');
    }
  },
};
