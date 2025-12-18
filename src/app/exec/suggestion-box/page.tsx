import AdminSuggestionBox from "./AdminSuggestionBox";

export const dynamic = "force-dynamic";

export default function ExecSuggestionBoxPage({
  searchParams,
}: {
  searchParams?: { take?: string };
}) {
  const takeRaw = Number(searchParams?.take ?? "30");
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 100) : 30;

  return <AdminSuggestionBox take={take} />;
}
