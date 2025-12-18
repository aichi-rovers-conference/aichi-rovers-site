import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function sanitizeShortText(v: unknown, max: number) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function sanitizeOrigin(v: unknown) {
  const t = sanitizeShortText(v, 40);
  if (!t) return "web";
  // 変な文字を弾く（必要なら緩めてOK）
  if (!/^[a-z0-9_-]+$/i.test(t)) return "web";
  return t;
}

export async function POST(req: Request) {
  const data = (await req.json().catch(() => null)) as
    | {
        subject?: string;
        body?: string;
        category?: string;
        isAnonymous?: boolean;
        contactEmail?: string | null;
        origin?: string;
      }
    | null;

  const subject = String(data?.subject ?? "").trim();
  const body = String(data?.body ?? "").trim();

  if (!subject || !body) {
    return NextResponse.json({ message: "件名と本文は必須です" }, { status: 400 });
  }
  if (subject.length > 80) {
    return NextResponse.json({ message: "件名が長すぎます（最大80文字）" }, { status: 400 });
  }
  if (body.length > 2000) {
    return NextResponse.json({ message: "本文が長すぎます（最大2000文字）" }, { status: 400 });
  }

  const isAnonymous = typeof data?.isAnonymous === "boolean" ? data.isAnonymous : true;

  // 匿名OFFのときだけメール必須
  const emailRaw = (typeof data?.contactEmail === "string" ? data.contactEmail : "").trim();
  if (!isAnonymous) {
    if (!emailRaw) {
      return NextResponse.json(
        { message: "匿名でない場合は連絡先メールを入力してください" },
        { status: 400 }
      );
    }
    if (emailRaw.length > 254 || !looksLikeEmail(emailRaw)) {
      return NextResponse.json({ message: "メールアドレスの形式が正しくありません" }, { status: 400 });
    }
  }

  const category = sanitizeShortText(data?.category, 40);
  const contactEmail = isAnonymous ? null : emailRaw.slice(0, 254);

  // origin は投稿側から渡せるように（今まで通り固定にしたければ "web" に戻してOK）
  const origin = sanitizeOrigin(data?.origin);

  const ip = getClientIp(req);
  const salt = process.env.SUGGESTION_IP_SALT ?? "";
  const ipHash = ip ? sha256Hex(`${salt}:${ip}`) : null;

  const ua = req.headers.get("user-agent");
  const userAgent = ua ? ua.slice(0, 256) : null;

  const created = await prisma.suggestion.create({
    data: {
      subject,
      body,
      category,
      isAnonymous,
      contactEmail,
      ipHash,
      userAgent,
      origin,
      status: "NEW",
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, ...created }, { status: 201 });
}
