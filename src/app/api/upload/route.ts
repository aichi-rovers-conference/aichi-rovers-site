import { NextResponse } from "next/server";
import { put } from "@vercel/blob"; // ← 追加
import { mkdir, writeFile } from "fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMIT = 10 * 1024 * 1024; // 10MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, message: "file is required" }, { status: 400 });
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ ok: false, message: "unsupported file type" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > LIMIT) {
      return NextResponse.json({ ok: false, message: "file too large" }, { status: 400 });
    }

    const ext = EXT[file.type] ?? "bin";
    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 16)}.${ext}`;

    // === 本番（Vercel + Tokenあり）は Blob へ ===
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (process.env.VERCEL && token) {
      const { url } = await put(key, buffer, {
        access: "public",
        contentType: file.type,
        token, // ← Vercel Blob のRWトークン
      });
      return NextResponse.json({
        ok: true,
        url, // 例: https://xxxx.public.blob.vercel-storage.com/uploads/....
        name: (file as any).name ?? key,
        size: buffer.length,
      });
    }

    // === ローカル開発では従来通り public/uploads に保存 ===
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}.${ext}`;
    const filePath = path.join(uploadsDir, name);
    await writeFile(filePath, buffer);
    const url = `/uploads/${name}`;
    return NextResponse.json({ ok: true, url, name: (file as any).name ?? name, size: buffer.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "upload failed" }, { status: 500 });
  }
}
