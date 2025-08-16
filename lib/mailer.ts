// src/lib/mailer.ts
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST!;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER!;
const pass = process.env.SMTP_PASS!;
const from = process.env.SMTP_FROM!; // 例: '"ARC" <no-reply@yourdomain>'

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

export async function sendMail(to: string, subject: string, html: string, text?: string) {
  return transporter.sendMail({ from, to, subject, html, text });
}
