// src/app/exec/suggestion-box/page.tsx
import AdminSuggestionBox from "./AdminSuggestionBox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function Page({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};

  const takeRaw = pickFirst(sp.take);
  const takeNum = Number(takeRaw ?? "50");

  // 変な値対策（0/NaN/負数/デカすぎ）
  const take = Number.isFinite(takeNum) ? Math.min(Math.max(takeNum, 1), 200) : 50;

  return <AdminSuggestionBox take={take} />;
}
