// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function htmlRedirect(nextAbs: string): NextResponse {
  const body = `<!doctype html><meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${nextAbs}">
<title>Signing out…</title>
<p>ログアウト中…遷移しない場合は <a href="${nextAbs}">こちら</a></p>
<script>location.replace("${nextAbs}")</script>`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function kill(res: NextResponse, name: string, opts: { path?: string; domain?: string } = {}) {
  // 両方送る（ブラウザ実装差を踏み潰す）
  res.cookies.set(name, "", { ...opts, httpOnly: true, path: opts.path ?? "/", maxAge: 0 });
  res.cookies.set(name, "", { ...opts, httpOnly: true, path: opts.path ?? "/", expires: new Date(0) });
}

function clearAll(res: NextResponse, req: Request) {
  const url = new URL(req.url);
  const host = url.hostname;                       // 例: www.aichirovers.com
  const apex = host.startsWith("www.") ? host.slice(4) : host; // aichirovers.com
  const isProd = process.env.NODE_ENV === "production";
  const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "aichirovers.com";
  const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? `.${CANONICAL_HOST}`;

  const names = [COOKIE_NAME, "arc_session", "arc_session_v2"];

  // host-only
  for (const n of names) kill(res, n, { path: "/" });

  // 設計上の既定ドメイン（本番発行時と一致）
  if (isProd) {
    for (const n of names) kill(res, n, { path: "/", domain: COOKIE_DOMAIN });
  }

  // 念のため、現在ホスト／apex／.apex も全消し
  const domains = new Set<string>([host, apex, `.${apex}`]);
  for (const d of domains) {
    for (const n of names) kill(res, n, { path: "/", domain: d });
  }
}

function buildHtmlRes(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/?loggedOut=1";
  const toAbs = new URL(next, url.origin).toString();
  return htmlRedirect(toAbs);
}

export async function POST(req: Request) {
  const res = buildHtmlRes(req);
  clearAll(res, req);
  return res;
}

export async function GET(req: Request) {
  const res = buildHtmlRes(req);
  clearAll(res, req);
  return res;
}
