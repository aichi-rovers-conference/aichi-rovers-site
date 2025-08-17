// app/api/email/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import nodemailer from "nodemailer";

export const runtime = "nodejs";       // ← nodemailer なので Node.js を明示
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "false") === "true";
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

/** 改行維持＋URL自動リンクの簡易HTML化 */
function textToHtml(text: string): string {
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  // 先にURLをマーキング → エスケープ → aタグに置換
  const marked = String(text ?? "").replace(/(https?:\/\/[^\s]+)/g, (u) => `__L__${u}__R__`);
  const escaped = esc(marked).replace(/__L__(https?:\/\/[^\s]+)__R__/g, (_m, u) => {
    const href = esc(u);
    return `<a href="${href}" target="_blank" rel="noreferrer">${href}</a>`;
  });
  return `
  <div style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
              font-size:14px;line-height:1.7;color:#0f172a;white-space:pre-line;">
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
    if (me.role !== "ADMIN" && !me.isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 入力
    const body = (await req.json().catch(() => ({}))) as { max?: number };
    const max = Math.min(200, Math.max(1, Number.isFinite(Number(body?.max)) ? Number(body!.max) : 50));

    const transporter = getTransport();
    if (!transporter) {
      return NextResponse.json(
        { error: "NO_SMTP", message: "SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS を設定してください" },
        { status: 400 }
      );
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;

    // 送信待ちを古い順にバッチ取得
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
          text: m.body ?? "",
          html,
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
    return NextResponse.json(
      { ok: true, sent, failed, remaining },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
