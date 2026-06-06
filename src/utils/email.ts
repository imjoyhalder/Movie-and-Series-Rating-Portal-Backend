import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Lazy singleton — created on first use so Vercel cold starts don't try to
// open an SMTP connection before the function is actually invoked.
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    // Throw early rather than letting Nodemailer fail with an obscure auth error.
    throw new Error(
      '[email] SMTP_USER or SMTP_PASS environment variable is not set. ' +
      'Go to your Vercel dashboard → Project → Settings → Environment Variables and add: ' +
      'SMTP_USER, SMTP_PASS, EMAIL_FROM, FRONTEND_URL'
    );
  }

  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    // Prevent cold-start SMTP handshakes from hanging a serverless function
    connectionTimeout: 10_000,
    greetingTimeout:   10_000,
    socketTimeout:     15_000,
    tls: {
      // Some SMTP providers (e.g. Gmail App Passwords) need this in certain
      // serverless environments where the TLS chain isn't fully trusted.
      rejectUnauthorized: false,
    },
  });

  return _transporter;
}

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendMailOptions): Promise<void> => {
  const transporter = getTransporter();
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Reset the cached transporter so the next call gets a fresh connection
    // instead of retrying on a broken socket.
    _transporter = null;
    console.error('[email] sendMail failed:', err);
    throw err;
  }
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
    <p style="color:#999;font-size:12px;">CinePortal &mdash; Your streaming destination</p>
  </div>
`;

export const emailOtpHtml = (email: string, otp: string): string => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">🎬 CinePortal</h1>
      <p style="color:#fde68a;margin:8px 0 0;font-size:14px;">Email Verification</p>
    </div>
    <div style="padding:32px;background:#111111;">
      <p style="color:#e5e5e5;font-size:15px;margin:0 0 20px;">Hi there!</p>
      <p style="color:#a3a3a3;font-size:14px;margin:0 0 28px;line-height:1.6;">
        Use the verification code below to confirm your email address <strong style="color:#e5e5e5;">${email}</strong>.
        The code expires in <strong style="color:#e5e5e5;">10 minutes</strong>.
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <div style="display:inline-block;background:#1f1f1f;border:2px solid #d97706;border-radius:12px;padding:20px 36px;">
          <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#d97706;font-family:monospace;">${otp}</span>
        </div>
      </div>
      <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6;">
        If you did not create a CinePortal account, you can safely ignore this email.
      </p>
    </div>
    <div style="background:#0a0a0a;padding:16px;text-align:center;">
      <p style="color:#4b5563;font-size:12px;margin:0;">CinePortal &mdash; Your streaming destination</p>
    </div>
  </div>
`;

export const forgotPasswordOtpHtml = (email: string, otp: string): string => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1d4ed8,#1e40af);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">🔐 Password Reset</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">CinePortal Account Security</p>
    </div>
    <div style="padding:32px;background:#111111;">
      <p style="color:#e5e5e5;font-size:15px;margin:0 0 20px;">Hi there!</p>
      <p style="color:#a3a3a3;font-size:14px;margin:0 0 28px;line-height:1.6;">
        We received a password reset request for <strong style="color:#e5e5e5;">${email}</strong>.
        Enter the code below to reset your password. It expires in <strong style="color:#e5e5e5;">10 minutes</strong>.
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <div style="display:inline-block;background:#1f1f1f;border:2px solid #3b82f6;border-radius:12px;padding:20px 36px;">
          <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#60a5fa;font-family:monospace;">${otp}</span>
        </div>
      </div>
      <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6;">
        If you did not request a password reset, please ignore this email. Your account remains secure.
      </p>
    </div>
    <div style="background:#0a0a0a;padding:16px;text-align:center;">
      <p style="color:#4b5563;font-size:12px;margin:0;">CinePortal &mdash; Your streaming destination</p>
    </div>
  </div>
`;
