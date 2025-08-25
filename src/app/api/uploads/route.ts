// src/app/api/uploads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMIT = 10 * 1024 * 1024; // 10MB
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

// File/Blob 互換判定（Node でも動く）
type FileLike = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  type?: string;
  name?: string;
  size?: number;
};
function isFileLike(v: unknown): v is FileLike {
  return !!v && typeof v === "object" && typeof (v as any).arrayBuffer === "function";
}

// 動作確認用
export async function GET() {
  return NextResponse.json({ ok: true, ping: "pong" });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const part = form.get("file");

    if (!isFileLike(part)) {
      return NextResponse.json({ ok: false, message: "file is required" }, { status: 400 });
    }

    const type = (part.type || "").toLowerCase();
    if (!ALLOWED.has(type)) {
      return NextResponse.json(
        { ok: false, message: "unsupported file type", receivedType: type || null },
        { status: 415 },
      );
    }

    const buf = Buffer.from(await part.arrayBuffer());
    if (buf.length > LIMIT) {
      return NextResponse.json({ ok: false, message: "file too large (10MB)" }, { status: 413 });
    }

    const ext = EXT[type] ?? "bin";
    const key =
      `uploads/${new Date().toISOString().slice(0, 10)}/` +
      `${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${ext}`;

    // === 本番(Vercel)は Vercel Blob へ保存 ===
    if (process.env.VERCEL) {
      const blob = await put(key, buf, {
        access: "public",
        contentType: type,
        cacheControlMaxAge: 60 * 60 * 24 * 365, // 1年キャッシュ
        token: process.env.BLOB_READ_WRITE_TOKEN, // プロジェクト設定で発行していれば自動利用
      });

      return NextResponse.json({
        ok: true,
        url: blob.url, // ← この https URL を DB に保存
        name: part.name ?? key,
        size: buf.length,
        contentType: type,
      });
    }

    // === ローカル開発は /public/uploads に保存 ===
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}.${ext}`;
    await writeFile(path.join(uploadsDir, name), buf);

    return NextResponse.json({
      ok: true,
      url: `/uploads/${name}`, // ← ローカルはこれでOK（Next/Imageの最適化にもかかる）
      name: part.name ?? name,
      size: buf.length,
      contentType: type,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "upload failed" },
      { status: 500 },
    );
  }
}