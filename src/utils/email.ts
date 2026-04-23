import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendMailOptions): Promise<void> => {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

export const passwordResetEmailHtml = (name: string, resetUrl: string): string => `
  <h2>Hi ${name},</h2>
  <p>You requested a password reset. Click the button below to reset your password.</p>
  <a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
    Reset Password
  </a>
  <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
`;

export const emailVerificationHtml = (name: string, verifyUrl: string): string => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <h2 style="color:#1a1a1a;">Welcome to Movie Portal, ${name}!</h2>
    <p style="color:#444;">Thanks for registering. Please verify your email address to activate your account.</p>
    <a href="${verifyUrl}" style="background:#16a34a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0;">
      Verify Email Address
    </a>
    <p style="color:#666;font-size:14px;">This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <p style="color:#999;font-size:12px;">Movie Portal &mdash; Your streaming destination</p>
  </div>
`;
