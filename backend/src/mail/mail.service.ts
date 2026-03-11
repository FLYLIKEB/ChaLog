import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST;
      if (!host) {
        return null;
      }
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const transporter = this.getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || '"ChaLog" <noreply@chalog.app>',
      to: email,
      subject: '[ChaLog] 비밀번호 재설정',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>비밀번호 재설정</h2>
          <p>아래 버튼을 클릭하여 비밀번호를 재설정하세요.</p>
          <p>링크는 <strong>30분</strong> 후 만료됩니다.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1db93c;color:#fff;text-decoration:none;border-radius:8px;">비밀번호 재설정</a>
          <p style="margin-top:24px;color:#6b7280;font-size:14px;">본인이 요청하지 않은 경우 이 이메일을 무시하세요.</p>
        </div>
      `,
    };

    if (!transporter) {
      this.logger.warn(`[DEV] Password reset email to ${email}: ${resetUrl}`);
      return;
    }

    await transporter.sendMail(mailOptions);
  }
}
