"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

export type MemberFormValue = {
  id?: string;
  name: string;
  unit: string;
  role?: string | null;
  birthDate?: string | null; // YYYY-MM-DD
  hometown?: string | null;
  photoUrl?: string | null;
  extras?: Record<string, string> | null;
  order?: number;
  isPublished?: boolean;
};


const EXTRA_OPTIONS = [
  { key: "好きなこと", placeholder: "例：登山、写真、キャンプ飯" },
  { key: "座右の銘", placeholder: "例：備えよ常に" },
  { key: "マイブーム", placeholder: "例：ドリップコーヒー" },
  { key: "今後の目標", placeholder: "例：県内合同ハイクを企画" },
  { key: "メッセージ", placeholder: "例：一緒に挑戦しましょう！" },
];


export default function MemberForm({
  value,
  onChange,
  onSubmit,
  submitLabel = "保存",
}: {
  value: MemberFormValue;
  onChange: (v: MemberFormValue) => void;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  const [newExtraKey, setNewExtraKey] = useState<string>("");
  const extras = useMemo(() => ({ ...(value.extras ?? {}) }), [value.extras]);

  const addExtra = () => {
    if (!newExtraKey) return;
    if (!extras[newExtraKey]) extras[newExtraKey] = "";
    onChange({ ...value, extras });
    setNewExtraKey("");
};

return (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="grid gap-4 sm:grid-cols-2">
      
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">名前（必須）</span>
        <input
          className="rounded-lg border p-2"
          required
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">役職</span>
        <input
          className="rounded-lg border p-2"
          value={value.role ?? ""}
          onChange={(e) => onChange({ ...value, role: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">所属団（必須）</span>
        <input
          className="rounded-lg border p-2"
          required
          value={value.unit}
          onChange={(e) => onChange({ ...value, unit: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">生年月日</span>
        <input
          type="date"
          className="rounded-lg border p-2"
          value={value.birthDate ?? ""}
          onChange={(e) => onChange({ ...value, birthDate: e.target.value || null })}
        />
      </label>
    
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">出身地</span>
        <input
          className="rounded-lg border p-2"
          value={value.hometown ?? ""}
          onChange={(e) => onChange({ ...value, hometown: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">表示順（小さいほど上）</span>
          <input
            type="number"
            className="rounded-lg border p-2"
            value={value.order ?? 0}
            onChange={(e) => onChange({ ...value, order: Number(e.target.value || 0) })}
          />
        </label>

        <label className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            className="size-4"
            checked={value.isPublished ?? true}
            onChange={(e) => onChange({ ...value, isPublished: e.target.checked })}
          />
          <span className="text-sm">公開する</span>
        </label>
      </div>
      {/* 任意フィールドの追加 */}
      <div className="mt-6">
        <div className="mb-2 text-sm font-semibold">任意項目を追加</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border p-2"
            value={newExtraKey}
            onChange={(e) => setNewExtraKey(e.target.value)}
          >
            <option value="">— 選択 —</option>
            {EXTRA_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.key}</option>
            ))}
          </select>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={addExtra}
            className="rounded-xl border bg-gray-50 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
          >
            追加
          </motion.button>
        </div>
        {/* 追加済みの任意項目 */}
        <div className="mt-4 grid gap-3">
          {Object.keys(extras).length === 0 && (
            <div className="text-sm text-gray-500">追加された項目はありません</div>
          )}
          {Object.entries(extras).map(([k, v]) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-sm font-semibold">{k}</span>
              <input
                className="rounded-lg border p-2"
                placeholder={EXTRA_OPTIONS.find((o) => o.key === k)?.placeholder}
                value={String(v ?? "")}
                onChange={(e) => onChange({ ...value, extras: { ...extras, [k]: e.target.value } })}
              />
              <div className="pt-1">
                <button  
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => {
                    const { [k]: _, ...rest } = extras;
                    onChange({ ...value, extras: Object.keys(rest).length ? rest : null });
                  }}
                >
                  削除
                </button>
              </div>
            </label>
          ))}
        </div>
      </div>
      
      <div className="mt-6 flex justify-end gap-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onSubmit}
          className="rounded-xl bg-indigo-600 px-5 py-2 text-white shadow hover:bg-indigo-500"
        >
          {submitLabel}
        </motion.button>
      </div>
    </div>
  );
}