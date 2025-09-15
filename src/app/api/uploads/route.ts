// src/app/api/uploads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMIT = 10 * 1024 * 1024; // 10MB
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

// 簡易 HEIC/HEIF 判定（type が無い／誤っている場合の救済）
function looksLikeHeic(buf: Buffer, filename?: string, mime?: string) {
  const name = (filename || "").toLowerCase();
  if (name.endsWith(".heic") || name.endsWith(".heif")) return true;
  const m = (mime || "").toLowerCase();
  if (m.includes("heic") || m.includes("heif")) return true;
  // ISO BMFF: 4..8 が "ftyp", 8..12 がブランド
  const brand = buf.subarray(8, 12).toString("ascii");
  return brand.includes("heic") || brand.includes("heif") || brand.includes("mif1") || brand.includes("msf1");
}

function canUpload(session: any) {
  const role = session?.role ?? session?.user?.role;
  return role === "ADMIN" || role === "EDITOR" || session?.isSuper === true;
}

// 動作確認
export async function GET() {
  return NextResponse.json({ ok: true, ping: "pong" });
}

export async function POST(req: NextRequest) {
  try {
    // 認可
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
    const session = token ? await verifyToken(token) : null;
    if (!session || !canUpload(session)) {
      return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const part = form.get("file");
    if (!part || typeof part === "string" || typeof (part as any).arrayBuffer !== "function") {
      return NextResponse.json({ ok: false, message: "file is required" }, { status: 400 });
    }

    const file = part as unknown as File;
    const filename = (file as any).name as string | undefined;
    const mime = ((file as any).type || "").toLowerCase();
    const buf = Buffer.from(await (file as any).arrayBuffer());

    if (buf.length > LIMIT) {
      return NextResponse.json({ ok: false, message: "file too large (10MB)" }, { status: 413 });
    }

    // MIME 許容（type が空の iOS 対策として HEIC スニッフ許容）
    const acceptAs = ALLOWED.has(mime) ? mime : looksLikeHeic(buf, filename, mime) ? "image/heic" : mime;
    if (!ALLOWED.has(acceptAs)) {
      return NextResponse.json(
        { ok: false, message: "unsupported file type", receivedType: mime || null },
        { status: 415 },
      );
    }

    // 画像処理（HEIC/HEIF や巨大画像は WebP にリサイズ変換 / 向き補正）
    // 透明保持: PNG→WebP は透過維持可能。写真はだいたい非透過。
    let out = buf;
    let outMime = mime || "image/webp";
    let outExt = "webp";
    let meta: sharp.Metadata | undefined;

    try {
      const img = sharp(buf, { animated: false }); // Live Photo 動画は非対応
      // HEIC/HEIF または大きすぎる場合は WebP に
      const needConvert =
        acceptAs.includes("heic") ||
        acceptAs.includes("heif") ||
        mime === "" ||
        buf.length > 2.5 * 1024 * 1024; // 2.5MB超は圧縮

      if (needConvert) {
        const pipe = img.rotate(); // EXIFの向き補正
        // サイズが極端に大きい場合は幅 1600px に縮小（縦横最大側に合わせる）
        meta = await img.metadata();
        const width = meta.width || 0;
        const resized = width > 1600 ? pipe.resize(1600) : pipe;
        out = await resized.webp({ quality: 82 }).toBuffer();
        outMime = "image/webp";
        outExt = "webp";
      } else {
        // 変換不要でも向き補正だけ反映
        out = await img.rotate().toBuffer();
        // 拡張子は元のまま推定
        if (acceptAs.includes("jpeg") || acceptAs.includes("jpg")) outExt = "jpg";
        else if (acceptAs.includes("png")) outExt = "png";
        else if (acceptAs.includes("webp")) outExt = "webp";
        else if (acceptAs.includes("avif")) outExt = "avif";
        outMime = acceptAs || outMime;
      }
    } catch {
      // 画像処理に失敗したらそのままアップロード（最後の手段）
      out = buf;
      outMime = mime || "application/octet-stream";
      outExt = (filename?.split(".").pop() || "bin").replace(/[^a-z0-9]/g, "");
    }

    // 保存キー
    const key =
      `uploads/${new Date().toISOString().slice(0, 10)}/` +
      `${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${outExt}`;

    // === 本番(Vercel)は Vercel Blob へ保存 ===
    if (process.env.VERCEL) {
      const blob = await put(key, out, {
        access: "public",
        contentType: outMime,
        cacheControlMaxAge: 60 * 60 * 24 * 365, // 1年キャッシュ
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return NextResponse.json({
        ok: true,
        url: blob.url, // ← 公開URL（DBの photoUrl に保存）
        name: filename ?? key,
        size: out.length,
        contentType: outMime,
        format: outExt,
      });
    }

    // === ローカル開発は /public/uploads へ保存 ===
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}.${outExt}`;
    await writeFile(path.join(uploadsDir, name), out);

    return NextResponse.json({
      ok: true,
      url: `/uploads/${name}`,
      name: filename ?? name,
      size: out.length,
      contentType: outMime,
      format: outExt,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "upload failed" }, { status: 500 });
  }
}
