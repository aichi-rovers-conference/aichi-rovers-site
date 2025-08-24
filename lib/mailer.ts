// src/lib/mailer.ts
import nodemailer from "nodemailer";

type Env = {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: string;
  SMTP_FROM?: string;
  MAIL_FROM?: string;
  MAIL_DEBUG?: string; // ← これを追記
};

let cachedTransporter: nodemailer.Transporter | null = null;

export function smtpEnvStatus() {
  const e = process.env as Env;
  return {
    SMTP_HOST: !!e.SMTP_HOST,
    SMTP_PORT: !!e.SMTP_PORT,
    SMTP_USER: !!e.SMTP_USER,
    SMTP_PASS: !!e.SMTP_PASS,
    SMTP_SECURE: e.SMTP_SECURE ?? null,
    SMTP_FROM: !!e.SMTP_FROM,
    MAIL_FROM: !!e.MAIL_FROM,
    MAIL_DEBUG: e.MAIL_DEBUG ?? null,
    NODE: process.version,
  };
}

function readAndValidateEnv() {
  const e = process.env as Env;
  const host = e.SMTP_HOST;
  const portStr = e.SMTP_PORT ?? "587";
  const user = e.SMTP_USER;
  const pass = e.SMTP_PASS;
  const from = e.SMTP_FROM ?? e.MAIL_FROM;
  const secure =
    typeof e.SMTP_SECURE === "string" ? /^true$/i.test(e.SMTP_SECURE) : Number(portStr) === 465;
  const port = Number(portStr);

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!portStr) missing.push("SMTP_PORT");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  if (!from) missing.push("SMTP_FROM or MAIL_FROM");
  if (!Number.isFinite(port)) missing.push("SMTP_PORT(number)");

  if (missing.length) {
    const detail = JSON.stringify(smtpEnvStatus());
    throw new Error(`SMTP not configured: missing ${missing.join(", ")} / status=${detail}`);
  }

  return { host, port, user, pass, from, secure };
}

export function getMailer() {
  if (cachedTransporter) return cachedTransporter;
  const { host, port, user, pass, secure } = readAndValidateEnv();

  const debugOn = process.env.MAIL_DEBUG === "1";
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure, // 465=true / 587=false（STARTTLS）
    auth: { user, pass },
    logger: debugOn, // ← コンソールに詳細ログ
    debug: debugOn,  // ← SMTPトラフィックも出力
    // tls: { minVersion: "TLSv1.2" }, // 必要なら
  });

  return cachedTransporter;
}

export async function sendMail(to: string, subject: string, html: string, text?: string) {
  const { from } = readAndValidateEnv();
  return getMailer().sendMail({ from, to, subject, html, text });
}
