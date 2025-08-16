// src/app/exec/participants/manage/DeleteButton.tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function DeleteButton({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted?: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (!confirm("この参加者を削除します。よろしいですか？\n※ この操作は取り消せません")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/participants/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      onDeleted?.(id); // ← 親に反映させる
    } catch (e: any) {
      alert(e?.message || "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
      title="削除"
    >
      <Trash2 className="h-3.5 w-3.5" />
      削除
    </button>
  );
}
