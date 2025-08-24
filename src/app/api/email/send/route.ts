// app/api/email/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getMailer, smtpEnvStatus } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** 改行維持＋URL自動リンク（簡易） */
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

/** 失敗メッセージから“ありがち原因”を推定 */
function classifySmtpError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("535") || m.includes("invalid login") || m.includes("authentication failed")) {
    return "認証エラー（SMTP_USER/SMTP_PASSが違う、またはリージョン違いの資格情報）";
  }
  if (m.includes("not verified") || m.includes("address is not verified")) {
    return "From（送信元）未検証 or SESのリージョン不一致（そのリージョンでドメイン/アドレスをVerifyしていない）";
  }
  if (m.includes("message rejected")) {
    return "SESポリシーによる拒否（送信元未検証、抑制リスト、ポリシー違反など）";
  }
  if (m.includes("self signed certificate") || m.includes("certificate")) {
    return "TLS証明書周り（まずは SMTP_PORT=587 / SMTP_SECURE=false で試す）";
  }
  return "不明（Networkタブのfailures/error全文またはSESコンソールのEventで要確認）";
}

export async function POST(req: NextRequest) {
  try {
    // ---- 認証 ----
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? "";
    const me = token ? await verifyToken(token) : null;
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.role !== "ADMIN" && !me.isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ---- 入力 ----
    const body = (await req.json().catch(() => ({}))) as { max?: number };
    const max = Math.min(200, Math.max(1, Number.isFinite(Number(body?.max)) ? Number(body!.max) : 50));

    // ---- メーラー取得 ----
    let transporter;
    try {
      transporter = getMailer();
    } catch (err: any) {
      return NextResponse.json(
        { error: "NO_SMTP", message: err?.message ?? "SMTP not configured", status: smtpEnvStatus() },
        { status: 400 }
      );
    }

    // ★ 事前に SMTP verify（認証やネットワークの根本異常を先に検出）
    try {
      await transporter.verify();
    } catch (e: any) {
      const msg = e?.message || String(e);
      return NextResponse.json(
        {
          error: "SMTP_VERIFY_FAILED",
          message: msg,
          hint: classifySmtpError(msg),
          status: smtpEnvStatus(),
        },
        { status: 400 }
      );
    }

    const from =
      process.env.SMTP_FROM ??
      process.env.MAIL_FROM ??
      (process.env.SMTP_USER as string);

    // ---- 送信待ち取得 ----
    const pending = await prisma.emailQueue.findMany({
      where: { status: "PENDING" },
      orderBy: { queuedAt: "asc" },
      take: max,
    });

    let sent = 0;
    let failed = 0;
    const failures: Array<{ id: string; to: string; error: string; reason: string }> = [];

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
        const errMsg = e?.message || String(e);
        const reason = classifySmtpError(errMsg);
        failures.push({ id: m.id, to: m.to, error: errMsg, reason });
        await prisma.emailQueue.update({
          where: { id: m.id },
          data: { status: "FAILED", error: errMsg },
        });
        failed++;
      }
    }

    const remaining = await prisma.emailQueue.count({ where: { status: "PENDING" } });

    // 代表的な“ヒント”をまとめて返す
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
