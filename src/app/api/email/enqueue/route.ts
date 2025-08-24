// app/api/meetings/qr/email/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // ← default import に統一
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { EmailStatus } from "@prisma/client";
import { renderTemplate } from "@/src/lib/mailTemplate";
import { buildPreviewQrUrl } from "@/src/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// baseUrlが来なかった場合に、絶対URLのオリジンを推定
function computeOrigin(req: NextRequest, baseUrl?: string) {
  if (baseUrl && typeof baseUrl === "string" && baseUrl.trim()) {
    return baseUrl.replace(/\/$/, "");
  }
  const xfProto = req.headers.get("x-forwarded-proto");
  const xfHost = req.headers.get("x-forwarded-host");
  const host = xfHost ?? req.headers.get("host") ?? process.env.CANONICAL_HOST ?? "";
  const proto = xfProto ?? (process.env.VERCEL ? "https" : "http");
  return host ? `${proto}://${host}`.replace(/\/$/, "") : "";
}

// 👇 ユーティリティをこのファイル先頭近くに追加
function toStringArrayUnique(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const arr = (input as unknown[])
    .map((v) => String(v ?? "")) // すべて文字列化
    .filter((s) => s.length > 0); // 空文字は除外（必要なら）
  return Array.from(new Set<string>(arr)); // 重複除去（<string>を明示）
}


export async function POST(req: NextRequest) {
  try {
    // 認証
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? "";
    const me = token ? await verifyToken(token) : null;
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 入力
    const b = (await req.json().catch(() => ({}))) as any;
    const meetingCode = String(b?.meetingCode ?? "").trim();
    const subjectTpl = String(b?.subject ?? "");
    const bodyTpl = String(b?.body ?? "");
    const origin = computeOrigin(req, b?.baseUrl);
    const ids: string[] = toStringArrayUnique(b?.participantIds);

    if (!meetingCode || !subjectTpl || !bodyTpl || ids.length === 0) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // 受信者（メールありのみ）
    const participants = await prisma.participant.findMany({
      where: { id: { in: ids }, email: { not: null } },
      select: { id: true, name: true, email: true, troop: true, district: true },
    });

    if (participants.length === 0) {
      return NextResponse.json({ ok: true, enqueued: 0, skipped: ids.length });
    }

    // テンプレ差し込みはクライアントと同じ関数を使用
    const rows = participants.map((p) => {
      const qrUrl = buildPreviewQrUrl(origin, meetingCode, p.id); // ← 共有関数で絶対URL生成
      const vars = {
        name: p.name,
        meeting: meetingCode,
        qr_url: qrUrl,
        troop: String(p.troop ?? ""),
        district: String(p.district ?? ""),
      };
      return {
        participantId: p.id,
        meetingCode,
        to: p.email as string,
        subject: renderTemplate(subjectTpl, vars),
        body: renderTemplate(bodyTpl, vars),
        status: EmailStatus.PENDING,
      };
    });

    await prisma.emailQueue.createMany({
      data: rows,
      // unique制約がある場合は有効化すると重複投入を回避できます
      // skipDuplicates: true,
    });

    return NextResponse.json({
      ok: true,
      enqueued: rows.length,
      skipped: ids.length - participants.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
