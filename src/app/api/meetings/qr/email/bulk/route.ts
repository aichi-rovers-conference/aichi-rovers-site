// app/api/meetings/qr/email/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { renderTemplate, normalizeNewlines } from "@/src/lib/mailTemplate";
import { buildPreviewQrUrl } from "@/src/lib/qr";
import crypto from "crypto";

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

    // 入力
    const body = (await req.json().catch(() => ({}))) as {
      meetingCode?: string;
      subject?: string;
      body?: string;
      participantIds?: unknown[];
    };
    const meetingCode = String(body?.meetingCode ?? "").trim();
    const tplSubject = String(body?.subject ?? "");
    const tplBody = String(body?.body ?? "");
    const ids = Array.isArray(body?.participantIds)
      ? Array.from(new Set((body!.participantIds as unknown[]).map((v) => String(v))))
      : [];

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

    // メールアドレスありの参加者のみ
    const participants = await prisma.participant.findMany({
      where: { id: { in: ids }, email: { not: null } },
      select: { id: true, name: true, email: true },
    });
    if (participants.length === 0) {
      return NextResponse.json({ ok: true, enqueued: 0, skipped: 0 });
    }

    // 本番URL（qr_url 生成に使用）
    const rawOrigin =
      (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      (process.env.APP_ORIGIN || "");
    const origin = (rawOrigin || "http://localhost:3000").replace(/\/$/, "");

    // バルク作成（idempotencyKey で二重投入防止）
    const items = await Promise.all(
      participants.map(async (p) => {
        const qr_url = await buildPreviewQrUrl(origin, meetingCode, p.id);
        const subject = normalizeNewlines(renderTemplate(tplSubject, { name: p.name, meeting: meetingCode, qr_url }));
        const textBody = normalizeNewlines(renderTemplate(tplBody, { name: p.name, meeting: meetingCode, qr_url }));

        const idempotencyKey = crypto
          .createHash("sha256")
          .update([meetingCode, p.id, p.email!, subject, textBody].join("::"))
          .digest("hex");

        return {
          participantId: p.id,
          meetingCode,
          to: p.email!, // not null
          subject,
          body: textBody,
          status: "PENDING" as const,
          queuedAt: new Date(),
          scheduledAt: new Date(),
          attempts: 0,
          idempotencyKey,
        };
      })
    );

    // skipDuplicates により既存キーはスキップ
    const res = await prisma.emailQueue.createMany({
      data: items,
      skipDuplicates: true,
    });

    const enqueued = res.count;
    const skipped = items.length - res.count;
    return NextResponse.json(
      { ok: true, enqueued, skipped },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
