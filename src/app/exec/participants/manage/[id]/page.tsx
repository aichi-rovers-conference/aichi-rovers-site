// src/app/exec/participants/manage/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Trash2, UserSquare2 } from "lucide-react";

const DISTRICTS = [
  "名古屋千種地区","名古屋西部地区","名古屋北斗地区","名古屋巽地区",
  "尾張西地区","尾張東地区","尾張南地区","知多北部地区","知多東地区",
  "知多西南地区","豊田地区","三河葵地区","碧海地区","穂の国地区","その他地区",
] as const;

type Participant = {
  id: string;
  name: string;
  troop: string;
  rsAge: number | null;
  district: string;      // 日本語ラベルでOK（API側で変換済）
  email?: string | null; // 追加
  createdAt?: string;
  updatedAt?: string;
};

export default function ParticipantDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState<Participant | null>(null);

  // 編集用 state
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [troop, setTroop] = useState("");
  const [rsAge, setRsAge] = useState<string>("");
  const [email, setEmail] = useState<string>(""); // 追加

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/participants/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (res.status === 404) {
          if (alive) { setError("データが見つかりません（404）"); setLoading(false); }
          return;
        }
        if (!res.ok) throw new Error((await res.text().catch(()=>"")) || `取得に失敗しました（${res.status}）`);
        const json = await res.json();
        const p: Participant = (json.item ?? json.participant ?? json) as Participant;

        if (!alive) return;
        setData(p);
        setName(p.name ?? "");
        setDistrict(p.district ?? "");
        setTroop(p.troop ?? "");
        setRsAge(typeof p.rsAge === "number" ? String(p.rsAge) : "");
        setEmail(p.email ?? ""); // 追加
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "通信エラーが発生しました");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const created = useMemo(() => fmtDateTime(data?.createdAt), [data?.createdAt]);
  const updated = useMemo(() => fmtDateTime(data?.updatedAt), [data?.updatedAt]);

  const onSave = async () => {
    if (!name.trim()) return alert("氏名は必須です");
    if (!district || !DISTRICTS.includes(district as any)) return alert("所属地区を選択してください");
    const ageNum = rsAge.trim() === "" ? null : Number(rsAge);
    if (ageNum != null && (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 10))
      return alert("RS年齢は1〜10の整数で入力してください");

    // email は任意。空なら null として送る
    const emailTrim = email.trim();
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      return alert("メールアドレスの形式が正しくありません");
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/participants/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          district,             // 日本語でOK（API側で enum に正規化）
          troop: troop.trim(),
          rsAge: ageNum,
          email: emailTrim || null,
        }),
      });

      if (!res.ok) {
        // 重複メールなどの個別ハンドリング
        let msg = `保存に失敗しました（${res.status}）`;
        try {
          const j = await res.json();
          if (j?.error === "DUPLICATE_EMAIL") msg = "このメールアドレスは既に登録されています。";
          else if (j?.message) msg = String(j.message);
        } catch {}
        throw new Error(msg);
      }

      const json = await res.json();
      const p: Participant = (json.item ?? json.participant ?? json) as Participant;
      setData(p);
      alert("保存しました");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "保存エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("この参加者を削除します。よろしいですか？\n※ この操作は取り消せません")) return;
    setError("");
    try {
      const res = await fetch(`/api/participants/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text().catch(()=>"")) || `削除に失敗しました（${res.status}）`);
      alert("削除しました");
      router.push("/exec/participants/manage");
    } catch (e: any) {
      setError(e?.message || "削除エラーが発生しました");
    }
  };

  if (loading) {
    return (
      <Card>
        <Header id={id} title="読み込み中…" />
        <p className="mt-2 text-sm text-gray-500">参加者情報を取得しています。</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Header id={id} />
        <p className="mt-2 text-sm text-rose-600">{error}</p>
        <div className="mt-4">
          <Link href="/exec/participants/manage" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 h-10 text-sm hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />
            一覧に戻る
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <Header id={id} title={data?.name} />
        <form className="mt-6 grid gap-5 max-w-3xl" onSubmit={(e) => { e.preventDefault(); void onSave(); }}>
          {/* 氏名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">氏名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white/95 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              placeholder="山田 太郎"
            />
          </div>

          {/* 地区 ＆ 団 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">所属地区</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white/95 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              >
                <option value="" disabled>選択してください</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">所属団</label>
              <input
                value={troop}
                onChange={(e) => setTroop(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white/95 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="例）千種地区 第66団"
              />
            </div>
          </div>

          {/* RS年齢 */}
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700">RS年齢</label>
            <input
              type="number" min={1} max={10}
              value={rsAge}
              onChange={(e) => setRsAge(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white/95 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              placeholder="1"
            />
          </div>

          {/* メール（任意） */}
          <div className="max-w-lg">
            <label className="block text-sm font-medium text-gray-700">メールアドレス（任意）</label>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white/95 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              placeholder="example@example.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              一斉送信に使用します。同一メールを複数人に登録することはできません。
            </p>
          </div>

          {/* 作成/更新 情報 */}
          {data && (
            <p className="text-xs text-gray-500">作成: {created ?? "-"}　/　更新: {updated ?? "-"}</p>
          )}

          {/* アクション */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-5 h-11 text-sm md:text-base shadow hover:bg-black transition disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? "保存中…" : "保存する"}
            </button>

            <Link href="/exec/participants/manage" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 h-11 text-sm hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />
              一覧に戻る
            </Link>

            <button type="button" onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 h-11 text-sm font-semibold text-white shadow-sm hover:opacity-95">
              <Trash2 className="h-4 w-4" />
              削除
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </form>
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-gray-200/70 bg-white/90 backdrop-blur p-6 lg:p-8 shadow-sm">
      {children}
    </div>
  );
}

function Header({ id, title }: { id: string; title?: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0 rounded-2xl bg-blue-600/90 text-white p-3 shadow">
        <UserSquare2 className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
          {title || "参加者詳細"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">ID: {id}</p>
      </div>
    </div>
  );
}

function fmtDateTime(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
