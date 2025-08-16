// クライアント/サーバー共通で使える軽量テンプレート関数
// 使い方: renderTemplate("こんにちは {{name}} さん", { name: "太郎" })
export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  if (!tpl) return "";
  return tpl.replace(/{{\s*([\w]+)\s*}}/g, (_m, key) => (vars[key] ?? ""));
}

// 改行は \n に正規化（サーバー側でSMTP経由でCRLFにされます）
export function normalizeNewlines(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
