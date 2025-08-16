// app/exec/participants/page.tsx
import Link from "next/link";
import { UserPlus, Database } from "lucide-react";

export default function ParticipantsHome() {
  const Card = ({
    href,
    title,
    desc,
    Icon,
  }: {
    href: string;
    title: string;
    desc: string;
    Icon: any;
  }) => (
    <Link
      href={href}
      className="group block rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition"
    >
      <div className="flex gap-4 items-start">
        <div className="rounded-xl bg-slate-100 p-3">
          <Icon className="size-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 text-slate-600">{desc}</p>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card
        href="/exec/participants/register"
        title="参加者を登録する"
        desc="単票登録（CSV一括は後で追加可）"
        Icon={UserPlus}
      />
      <Card
        href="/exec/participants/manage"
        title="データを閲覧・編集する"
        desc="検索、並び替え、個別編集、エクスポート"
        Icon={Database}
      />
    </div>
  );
}
