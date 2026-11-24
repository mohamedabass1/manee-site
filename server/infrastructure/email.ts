import nodemailer from 'nodemailer';
import { config } from '../config.ts';
import { getDb } from './db.ts';
import { EmailNotificationStatus, EmailNotificationStatusToInt } from '../domain/types.ts';

interface QueueItem {
  messageId: number;
  attempt: number;
}

const RETRY_DELAYS_MS = [30_000, 120_000, 600_000]; // 30s, 2m, 10m

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class AsyncEmailNotificationWorker {
  private queue: QueueItem[] = [];
  private processing = false;
  private activeTimers = new Set<ReturnType<typeof setTimeout>>();

  public enqueue(messageId: number, attempt = 0): void {
    this.queue.push({ messageId, attempt });
    void this.drain();
  }

  public recoverRecentPendingMessages(): void {
    try {
      const db = getDb();
      const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const pendingInt = EmailNotificationStatusToInt[EmailNotificationStatus.Pending];
      const failedInt = EmailNotificationStatusToInt[EmailNotificationStatus.Failed];

      const rows = db
        .prepare(
          `SELECT Id FROM ContactMessages
           WHERE NotificationStatus IN (?, ?) AND CreatedAt >= ?
           ORDER BY CreatedAt ASC`,
        )
        .all(pendingInt, failedInt, cutoffIso) as Array<{ Id: number }>;

      for (const row of rows) {
        this.enqueue(row.Id, 0);
      }
    } catch (err) {
      console.warn('[EmailWorker] تعذّر استعادة إشعارات آخر 24 ساعة:', (err as Error).message);
    }
  }

  private async drain(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift()!;
        await this.processItem(item);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    const db = getDb();
    const message = db
      .prepare(
        `SELECT Id, FullName, Phone, Email, Subject, Message, CreatedAt
         FROM ContactMessages WHERE Id = ?`,
      )
      .get(item.messageId) as
      | {
          Id: number;
          FullName: string;
          Phone: string;
          Email: string | null;
          Subject: string | null;
          Message: string;
          CreatedAt: string;
        }
      | undefined;

    if (!message) return;

    const settings = db
      .prepare(`SELECT NotificationEmail, SiteName FROM SiteSettings WHERE Id = 1`)
      .get() as { NotificationEmail: string | null; SiteName: string } | undefined;

    const notificationEmail = settings?.NotificationEmail?.trim() || '';
    if (!notificationEmail) {
      console.warn(
        `[EmailWorker] بريد الإشعارات NotificationEmail غير مضبوط في إعدادات الموقع؛ ستبقى الرسالة #${message.Id} بحالة Pending.`,
      );
      return;
    }

    if (!config.email.host || !config.email.fromAddress) {
      console.warn(
        `[EmailWorker] إعدادات خادم البريد SMTP غير مكتملة؛ تعذّر إرسال إشعار الرسالة #${message.Id}.`,
      );
      this.handleFailure(item);
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        requireTLS: config.email.useStartTls && config.email.port !== 465,
        auth:
          config.email.user && config.email.pass
            ? { user: config.email.user, pass: config.email.pass }
            : undefined,
      });

      const htmlBody = `
        <div dir="rtl" style="font-family: Arial, sans-serif; color: #0F172A; line-height: 1.7;">
          <h2 style="margin-bottom: 12px;">رسالة جديدة من الموقع — ${escapeHtml(settings?.SiteName || 'MANEE | مَنيع')}</h2>
          <p><strong>الاسم:</strong> ${escapeHtml(message.FullName)}</p>
          <p><strong>الهاتف:</strong> ${escapeHtml(message.Phone)}</p>
          <p><strong>البريد الإلكتروني:</strong> ${escapeHtml(message.Email || 'غير محدد')}</p>
          <p><strong>الموضوع:</strong> ${escapeHtml(message.Subject || 'استفسار عام')}</p>
          <p><strong>تاريخ الإرسال (UTC):</strong> ${escapeHtml(message.CreatedAt)}</p>
          <hr style="border: 0; border-top: 1px solid #E2E5EA; margin: 16px 0;" />
          <p style="white-space: pre-wrap;">${escapeHtml(message.Message)}</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
        to: notificationEmail,
        replyTo: message.Email || undefined,
        subject: `رسالة جديدة من الموقع: ${message.FullName}`,
        html: htmlBody,
      });

      db.prepare(`UPDATE ContactMessages SET NotificationStatus = ? WHERE Id = ?`).run(
        EmailNotificationStatusToInt[EmailNotificationStatus.Sent],
        message.Id,
      );
    } catch (err) {
      console.warn(
        `[EmailWorker] فشل إرسال إشعار الرسالة #${message.Id} (المحاولة ${item.attempt + 1}):`,
        (err as Error).message,
      );
      this.handleFailure(item);
    }
  }

  private handleFailure(item: QueueItem): void {
    if (item.attempt < RETRY_DELAYS_MS.length) {
      const delayMs = RETRY_DELAYS_MS[item.attempt];
      const timer = setTimeout(() => {
        this.activeTimers.delete(timer);
        this.enqueue(item.messageId, item.attempt + 1);
      }, delayMs);
      timer.unref();
      this.activeTimers.add(timer);
      return;
    }

    const db = getDb();
    db.prepare(`UPDATE ContactMessages SET NotificationStatus = ? WHERE Id = ?`).run(
      EmailNotificationStatusToInt[EmailNotificationStatus.Failed],
      item.messageId,
    );
  }
}

export const emailQueue = new AsyncEmailNotificationWorker();
