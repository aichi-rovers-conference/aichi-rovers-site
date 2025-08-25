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
const ALLOWED = new Set(["image/jpeg","image/jpg","image/png","image/webp","image/avif"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

// ✅ Node でも動く File/Blob-like 判定
type FileLike = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  type?: string;
  name?: string;
  size?: number;
};
function isFileLike(v: unknown): v is FileLike {
  return !!v && typeof v === "object" && typeof (v as any).arrayBuffer === "function";
}

// （404 切り分け用）GETは簡単な応答
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
        { status: 415 }
      );
    }

    const buf = Buffer.from(await part.arrayBuffer());
    if (buf.length > LIMIT) {
      return NextResponse.json(
        { ok: false, message: "file too large (10MB)" },
        { status: 413 }
      );
    }

    const ext = EXT[type] ?? "bin";
    const key =
      `uploads/${new Date().toISOString().slice(0, 10)}/` +
      `${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${ext}`;

    // 本番は Vercel Blob へ
    if (process.env.VERCEL) {
      const blob = await put(key, buf, {
        access: "public",
        contentType: type,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
        token: process.env.BLOB_READ_WRITE_TOKEN, // あれば使用
      });
      return NextResponse.json({
        ok: true,
        url: blob.url,
        name: part.name ?? key,
        size: buf.length,
        contentType: type,
      });
    }

    // ローカルは /public/uploads へ
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}.${ext}`;
    await writeFile(path.join(uploadsDir, name), buf);

    return NextResponse.json({
      ok: true,
      url: `/uploads/${name}`,
      name: part.name ?? name,
      size: buf.length,
      contentType: type,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "upload failed" },
      { status: 500 }
    );
  }
}
