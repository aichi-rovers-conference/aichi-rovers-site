// app/api/arc/conference/[fy]/[round]/qr/email/enqueue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { renderTemplate, normalizeNewlines } from "@/src/lib/mailTemplate";
import { buildPreviewQrUrl } from "@/src/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 認証
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? "";
    const me = token ? await verifyToken(token) : null;
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 入力
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const meetingCode = String(body?.meetingCode || "").trim();
    const tplSubject = String(body?.subject || "");
    const tplBody = String(body?.body || "");
    const idsInput = Array.isArray((body as any)?.participantIds)
      ? ((body as any).participantIds as unknown[])
      : [];
    // ← unknown[] → string[] へ確実に正規化（重複除去）
    const ids: string[] = Array.from(new Set(idsInput.map((v) => String(v))));

    if (!meetingCode || !tplSubject || !tplBody || ids.length === 0) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // Meeting 存在チェック
    const meeting = await prisma.meeting.findUnique({
      where: { code: meetingCode },
      select: { id: true },
    });
    if (!meeting) {
      return NextResponse.json({ error: "invalid_meeting" }, { status: 400 });
    }

    // メールアドレスありの対象者のみ
    const participants = await prisma.participant.findMany({
      where: { id: { in: ids }, email: { not: null } },
      select: { id: true, name: true, email: true },
    });
    if (participants.length === 0) {
      return NextResponse.json({ ok: true, enqueued: 0, failed: 0 });
    }

    // 本番URLの解決
    const rawOrigin =
      (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      (process.env.APP_ORIGIN || "");
    const origin = (rawOrigin || "http://localhost:3000").replace(/\/$/, "");

    let enqueued = 0;
    let failed = 0;

    for (const p of participants) {
      try {
        // /p/[token] 形式のURLを生成（内部で EmailToken 作成 or 再利用）
        const qr_url = await buildPreviewQrUrl(origin, meetingCode, p.id);

        const subject = normalizeNewlines(
          renderTemplate(tplSubject, { name: p.name, meeting: meetingCode, qr_url })
        );
        const textBody = normalizeNewlines(
          renderTemplate(tplBody, { name: p.name, meeting: meetingCode, qr_url })
        );

        await prisma.emailQueue.create({
          data: {
            participantId: p.id,
            meetingCode,
            to: p.email!, // not null で取得済み
            subject,
            body: textBody,
            status: "PENDING",
          },
        });
        enqueued++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ ok: true, enqueued, failed });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return NextResponse.json(
      { error: err?.code || "SERVER_ERROR", message: err?.message || String(e) },
      { status: 500 }
    );
  }
}
