"use client";

import { useEffect, useMemo, useState } from "react";
import MemberForm, { type MemberFormValue } from "@/src/components/excom/MemberForm";
import MemberCard from "@/src/components/excom/MemberCard";
import ImageUploader from "@/src/components/ImageUploader";

/** extras を常に Record<string, string> | null に正規化 */
function toExtrasRecord(input: unknown): Record<string, string> | null {
  if (!input) return null;

  // 文字列なら JSON として試しにパース
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;
    try {
      return toExtrasRecord(JSON.parse(s));
    } catch {
      return null;
    }
  }

  // 配列 [{label,value}] / [{key,value}] / [{name,value}] を Record に
  if (Array.isArray(input)) {
    const out: Record<string, string> = {};
    for (const it of input as any[]) {
      if (!it) continue;
      const label = String(it.label ?? it.key ?? it.name ?? "").trim();
      const value = String(it.value ?? "").trim();
      if (!label || !value) continue;
      out[label] = value;
    }
    return Object.keys(out).length ? out : null;
  }

  // 連想オブジェクト {label:value,...}
  if (typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>)
      .map(([k, v]) => [String(k).trim(), String(v ?? "").trim()] as const)
      .filter(([k, v]) => k && v);
    if (!entries.length) return null;
    return Object.fromEntries(entries);
  }

  return null;
}

function normalizeBirthDate(b?: string | Date | null): string | undefined {
  if (!b) return undefined;
  const d = new Date(b);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function toMemberCardModel(m: any) {
  return {
    name: String(m?.name ?? ""),
    unit: String(m?.unit ?? ""),
    role: m?.role ? String(m.role) : undefined,
    birthDate: normalizeBirthDate(m?.birthDate),
    photo: m?.photoUrl ? String(m.photoUrl) : undefined, // MemberCard は photo を見る想定
    extras: toExtrasRecord(m?.extras) ?? undefined,
    // 必要なら order などもここで渡せる
  };
}

export default function EditorClient() {
  const [list, setList] = useState<any[]>([]);
  const [draft, setDraft] = useState<MemberFormValue>({
    name: "",
    unit: "",
    isPublished: true,
    order: 0,
    // extras は型が Record<string,string> | null なので、明示的に null にしておく
    extras: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    const r = await fetch("/api/excom/members?all=1", { cache: "no-store" });
    const j = await r.json();
    setList(Array.isArray(j) ? j : []);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetDraft = () =>
    setDraft({ name: "", unit: "", isPublished: true, order: 0, extras: null });

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...draft,
        // ここで必ず正規化して送る
        extras: toExtrasRecord((draft as any).extras),
        birthDate: draft.birthDate || null,
      };
      const r = await fetch(
        editingId ? `/api/excom/members/${editingId}` : "/api/excom/members",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!r.ok) throw new Error("save failed");
      await fetchAll();
      setEditingId(null);
      resetDraft();
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setDraft({
      id: m.id,
      name: m.name,
      unit: m.unit,
      role: m.role ?? "",
      birthDate: m.birthDate ? String(m.birthDate).slice(0, 10) : "",
      hometown: m.hometown ?? "",
      photoUrl: m.photoUrl ?? "",
      // API が [] や JSON 文字列を返しても安全に受け取る
      extras: toExtrasRecord(m.extras),
      order: m.order ?? 0,
      isPublished: m.isPublished ?? true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    const r = await fetch(`/api/excom/members/${id}`, { method: "DELETE" });
    if (!r.ok) {
      alert("削除に失敗しました");
      return;
    }
    await fetchAll();
  };

  const sorted = useMemo(() => {
    return [...list].sort((a, b) => {
      const byOrder = (a?.order ?? 0) - (b?.order ?? 0);
      if (byOrder !== 0) return byOrder;
      const ca = String(a?.createdAt ?? "");
      const cb = String(b?.createdAt ?? "");
      return ca.localeCompare(cb);
    });
  }, [list]);

  // MemberForm から配列などが来てもここで正規化してから setDraft
  const handleFormChange = (v: MemberFormValue | any) => {
    setDraft((prev) => ({
      ...prev,
      ...v,
      extras: toExtrasRecord((v as any)?.extras),
    }));
  };

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-bold">新規作成 / 編集</h2>

        {/* 顔写真アップロード */}
        <div className="mb-4">
          <ImageUploader
            value={draft.photoUrl}
            onUploaded={(url) => setDraft((d) => ({ ...d, photoUrl: url }))}
            onClear={() => setDraft((d) => ({ ...d, photoUrl: "" }))}
          />
        </div>

        <MemberForm
          value={draft}
          onChange={handleFormChange}
          onSubmit={submit}
          submitLabel={editingId ? "更新" : "作成"}
        />
        {loading && <div className="mt-2 text-sm text-gray-500">保存中…</div>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">登録済み（{sorted.length}件）</h2>
        {/* 公開ページと同じ感覚：モバイル1・md 2・xl 3、余白広め */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((m) => (
            <div key={m.id} className="space-y-2">
              {/* ▼ ここが重要：MemberCard向けに正規化して渡す */}
              <MemberCard m={toMemberCardModel(m)} />

              {/* 操作ボタン */}
              <div className="flex gap-2 pt-1">
                <button
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => startEdit(m)}
                >
                  編集
                </button>
                <button
                  className="rounded-lg border px-3 py-1 text-sm text-red-600 hover:bg-gray-50"
                  onClick={() => del(m.id)}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
