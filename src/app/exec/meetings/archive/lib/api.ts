// APIヘルパ（絶対URL化・安全JSON・アップロード）
export const getAbsoluteUrl = (path: string) => {
  if (typeof window !== "undefined") return new URL(path, window.location.origin).toString();
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(path, base).toString();
};

export async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const text = await res.text();
  throw new Error(`Unexpected response (status ${res.status}): ${text.slice(0, 200)}`);
}

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(getAbsoluteUrl("/api/upload"), { method: "POST", body: fd });
  const json = await safeJson(res);
  if (!res.ok || !json?.ok) throw new Error(json?.message ?? "アップロードに失敗しました");
  return json.url as string; // 例: /uploads/xxx.jpg
}
