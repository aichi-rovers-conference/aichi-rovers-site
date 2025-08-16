import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** nodemailer transport 生成 */
function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "false") === "true";
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

function getTransportOrError() {
  const t = getTransport();
  if (!t) {
    const err: any = new Error("SMTP not configured");
    err.code = "NO_SMTP";
    throw err;
  }
  return t;
}

/** text を HTML に安全変換（改行維持 & URL 自動リンク） */
function textToHtml(text: string): string {
  const ESC = (s: string) =>
    s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));

  // URL を一旦マーカーで囲ってからエスケープ → マーカーを a タグに置換
  const marked = text.replace(/(https?:\/\/[^\s]+)/g, (u) => `__LINK__${u}__ENDLINK__`);
  let escaped = ESC(marked);
  escaped = escaped.replace(/__LINK__(https?:\/\/[^\s]+)__ENDLINK__/g, (_m, u) => {
    const href = ESC(u);
    return `<a href="${href}" target="_blank" rel="noreferrer">${href}</a>`;
  });

  // pre-line で \n を <br> 相当として表示
  return `
  <div style="
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    font-size: 14px; line-height: 1.7;
    color: #0f172a; /* slate-900 */
    white-space: pre-line;
  ">
    ${escaped}
  </div>`;
}

export async function POST(req: NextRequest) {
  try {
    // 認証
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? "";
    const me = token ? await verifyToken(token) : null;
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // （任意）管理者制限
    const isSuper = !!process.env.SUPERADMIN_USERNAME && me.username === process.env.SUPERADMIN_USERNAME.trim();
    // if (me.role !== "ADMIN" && !isSuper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const max = Math.min(200, Math.max(1, Number(body?.max || 50)));

    const transporter = getTransportOrError();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;

    // 送信待ち取得（古い順）
    const pending = await prisma.emailQueue.findMany({
      where: { status: "PENDING" },
      orderBy: { queuedAt: "asc" },
      take: max,
    });

    let sent = 0;
    let failed = 0;

    for (const m of pending) {
      try {
        const html = textToHtml(m.body || "");
        await transporter.sendMail({
          from,
          to: m.to,
          subject: m.subject,
          text: m.body, // プレーンテキスト（改行そのまま）
          html,         // HTML（改行=pre-line、URL自動リンク）
        });

        await prisma.emailQueue.update({
          where: { id: m.id },
          data: { status: "SENT", sentAt: new Date(), error: null },
        });
        sent++;
      } catch (e: any) {
        await prisma.emailQueue.update({
          where: { id: m.id },
          data: { status: "FAILED", error: e?.message || String(e) },
        });
        failed++;
      }
    }

    const remaining = await prisma.emailQueue.count({ where: { status: "PENDING" } });
    return NextResponse.json({ ok: true, sent, failed, remaining });
  } catch (e: any) {
    const code = e?.code || "SERVER_ERROR";
    const msg = e?.message || String(e);
    const status = code === "NO_SMTP" ? 400 : 500;
    return NextResponse.json({ error: code, message: msg }, { status });
  }
}
