// app/api/meetings/qr/email/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getMailer, smtpEnvStatus } from "@/lib/mailer";
import crypto from "crypto";

/** HTML化（改行維持＋URL簡易リンク化） */
function textToHtml(text: string): string {
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const marked = String(text ?? "").replace(/(https?:\/\/[^\s]+)/g, (u) => `__L__${u}__R__`);
  const escaped = esc(marked).replace(/__L__(https?:\/\/[^\s]+)__R__/g, (_m, u) => {
    const href = esc(u);
    return `<a href="${href}" target="_blank" rel="noreferrer">${href}</a>`;
  });
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;line-height:1.7;color:#0f172a;white-space:pre-line;">${escaped}</div>`;
}

/** 失敗メッセージから推定原因 */
function classifySmtpError(msg: string) {
  const m = (msg || "").toLowerCase();
  if (m.includes("535") || m.includes("invalid login") || m.includes("authentication failed"))
    return "認証エラー（SMTP_USER/SMTP_PASSが違う、またはリージョン違いの資格情報）";
  if (m.includes("not verified") || m.includes("address is not verified") || m.includes("identity"))
    return "From（送信元）未検証 or SESのリージョン不一致（そのリージョンでドメイン/アドレスをVerifyしていない）";
  if (m.includes("message rejected"))
    return "SESポリシーによる拒否（送信元未検証、抑制リスト、ポリシー違反など）";
  if (m.includes("throttl"))
    return "送信レート制限超過（SESのSending Quota/Rateを確認）";
  if (m.includes("self signed certificate") || m.includes("certificate"))
    return "TLS証明書問題（まず SMTP_PORT=587 / SMTP_SECURE=false で）";
  return "不明（failures[].error を参照 / プロバイダのイベントで要確認）";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // 認証 & 権限: ADMIN または isSuper のみ許可
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? "";
    const me = token ? await verifyToken(token) : null;
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.role !== "ADMIN" && !me.isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = (await req.json().catch(() => ({}))) as { max?: number };
    const max = Math.min(200, Math.max(1, Number.isFinite(Number(payload?.max)) ? Number(payload!.max) : 50));

    // メーラー
    let transporter;
    try {
      transporter = getMailer();
    } catch (err: any) {
      return NextResponse.json(
        { error: "NO_SMTP", message: err?.message ?? "SMTP not configured", status: smtpEnvStatus() },
        { status: 400 }
      );
    }
    try {
      await transporter.verify();
    } catch (e: any) {
      const msg = e?.message || String(e);
      return NextResponse.json(
        { error: "SMTP_VERIFY_FAILED", message: msg, hint: classifySmtpError(msg), status: smtpEnvStatus() },
        { status: 400 }
      );
    }

    const from = process.env.SMTP_FROM ?? process.env.MAIL_FROM ?? (process.env.SMTP_USER as string);

    // ===== ロック取得（PENDING & scheduledAt <= now & ロックなし/期限切れ）=====
    const lockId = crypto.randomUUID();
    const lockTTLms = 5 * 60 * 1000; // 5分
    const now = new Date();

    const targets = await prisma.$transaction(async (tx) => {
      const rows = await tx.emailQueue.findMany({
        where: {
          status: "PENDING",
          scheduledAt: { lte: now },
          OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(Date.now() - lockTTLms) } }],
        },
        orderBy: { scheduledAt: "asc" },
        take: Math.max(1, Math.min(500, max)),
      });

      if (rows.length === 0) return rows;

      await Promise.all(
        rows.map((r) =>
          tx.emailQueue.update({
            where: { id: r.id },
            data: { lockId, lockedAt: new Date() }, // status は PENDING のままで排他
          })
        )
      );

      return rows;
    });

    let sent = 0;
    let failed = 0;
    const failures: Array<{ id: string; to: string; error: string; reason: string; code?: any; respCode?: any }> = [];

    const backoffBaseMs = 5 * 60 * 1000; // 5分
    const maxAttempts = 5;

    for (const m of targets) {
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
          data: { status: "SENT", sentAt: new Date(), error: null, lockId: null, lockedAt: null },
        });
        sent++;
      } catch (e: any) {
        const errMsg = e?.message || String(e);
        const reason = classifySmtpError(errMsg);

        const attempts = (m.attempts ?? 0) + 1;
        const giveUp = attempts >= maxAttempts;

        const waitMs = Math.min(60 * 60 * 1000, backoffBaseMs * Math.pow(2, attempts - 1)); // 最大1時間
        const nextTime = new Date(Date.now() + waitMs);

        await prisma.emailQueue.update({
          where: { id: m.id },
          data: {
            attempts,
            status: giveUp ? "FAILED" : "PENDING",
            error: errMsg,
            lockId: null,
            lockedAt: null,
            scheduledAt: giveUp ? m.scheduledAt : nextTime,
          },
        });

        failures.push({ id: m.id, to: m.to, error: errMsg, reason, code: e?.code, respCode: e?.responseCode });
        failed++;
      }
    }

    const remaining = await prisma.emailQueue.count({
      where: { status: "PENDING", scheduledAt: { lte: new Date() } },
    });
    const hints = Array.from(new Set(failures.map((f) => f.reason)));

    return NextResponse.json(
      { ok: true, sent, failed, remaining, failures, hints },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
