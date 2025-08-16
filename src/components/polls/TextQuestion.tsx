"use client";
import React from "react";

type EditProps = {
  mode?: "edit" | "create";
  /** 設定の現在値（親が保持していない場合は props の各値を使う） */
  config?: {
    placeholder?: string;
    multiline?: boolean;
    rows?: number;
  };
  /** 設定が変わったとき親へ渡す（保存用）。未指定なら内部で完結 */
  onConfigChange?: (next: { placeholder: string; multiline: boolean; rows: number }) => void;

  // 初期値（configが未指定の場合に使用）
  name?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
};

type AnswerProps = {
  mode: "answer";
  name?: string;
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;

  // 回答ページに反映する設定（DBなどから読み出して渡す）
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
};

type Props = EditProps | AnswerProps;

// rowsを1..50にクランプ
const clampRows = (n: number | undefined, multiline: boolean) => {
  if (!multiline) return undefined;
  const v = typeof n === "number" && !Number.isNaN(n) ? n : 4;
  return Math.max(1, Math.min(50, v));
};

export default function TextQuestion(props: Props) {
  const isAnswer = props.mode === "answer";
  const name = props.name ?? "text-question";

  // ---- 共通のデフォルト決定 ----
  const defaultMultiline = ("multiline" in props && props.multiline !== undefined)
    ? !!props.multiline
    : true;

  const defaultRows = clampRows(
    "rows" in props ? props.rows : undefined,
    defaultMultiline
  );

  const defaultPlaceholder =
    ("placeholder" in props && props.placeholder !== undefined)
      ? props.placeholder!
      : (defaultMultiline ? "長文回答" : "回答を入力");

  // ====== 作成/編集モード ======
  if (!isAnswer) {
    const editProps = props as EditProps;
    // 外からconfigをもらえる場合はそれを優先
    const effectiveMultiline = editProps.config?.multiline ?? defaultMultiline;
    const effectiveRows = clampRows(editProps.config?.rows ?? defaultRows, effectiveMultiline);
    const effectivePlaceholder = editProps.config?.placeholder ?? defaultPlaceholder;

    const [localMultiline, setLocalMultiline] = React.useState<boolean>(effectiveMultiline);
    const [localRows, setLocalRows] = React.useState<number>(effectiveRows ?? 4);
    const [localPlaceholder, setLocalPlaceholder] = React.useState<string>(effectivePlaceholder);

    // 外からconfigが更新された場合に同期
    React.useEffect(() => {
      setLocalMultiline(effectiveMultiline);
      setLocalRows(effectiveRows ?? 4);
      setLocalPlaceholder(effectivePlaceholder);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editProps.config?.multiline, editProps.config?.rows, editProps.config?.placeholder]);

    const emitChange = (next: { placeholder: string; multiline: boolean; rows: number }) => {
      editProps.onConfigChange?.(next);
    };

    const handleToggleMultiline = (checked: boolean) => {
      const nextRows = checked ? clampRows(localRows, true)! : undefined;
      setLocalMultiline(checked);
      if (checked && !localRows) setLocalRows(4);
      emitChange({ placeholder: localPlaceholder, multiline: checked, rows: (nextRows ?? 4) });
    };

    const handleRowsChange = (v: string) => {
      const parsed = Number(v);
      const clamped = clampRows(Number.isNaN(parsed) ? undefined : parsed, true)!;
      setLocalRows(clamped);
      emitChange({ placeholder: localPlaceholder, multiline: localMultiline, rows: clamped });
    };

    const handlePlaceholderChange = (v: string) => {
      setLocalPlaceholder(v);
      emitChange({ placeholder: v, multiline: localMultiline, rows: localRows });
    };

    return (
      <div className="space-y-3">
        {/* 設定UI */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={localMultiline}
                onChange={(e) => handleToggleMultiline(e.target.checked)}
              />
              複数行にする
            </label>

            {localMultiline && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  行数
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={localRows}
                  onChange={(e) => handleRowsChange(e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none shadow-sm focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
                <p className="mt-1 text-[11px] text-slate-500">1〜50の範囲で指定できます</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                空欄時に表示するテキスト（プレースホルダー）
              </label>
              <input
                type="text"
                value={localPlaceholder}
                onChange={(e) => handlePlaceholderChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                placeholder={localMultiline ? "例）自由記述でご回答ください" : "例）回答を入力"}
              />
            </div>
          </div>
        </div>

        {/* プレビュー（設定反映） */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">回答</label>
          {localMultiline ? (
            <textarea
              name={name}
              disabled
              rows={localRows}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-[15px] outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              placeholder={localPlaceholder}
            />
          ) : (
            <input
              name={name}
              disabled
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[15px] outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              placeholder={localPlaceholder}
            />
          )}
          <p className="text-xs text-slate-400">プレビュー（作成画面では入力できません）</p>
        </div>
      </div>
    );
  }

  // ====== 回答モード（設定をそのまま反映） ======
  const { value, onValueChange, disabled } = props as AnswerProps;
  const multiline = ("multiline" in props && props.multiline !== undefined)
    ? !!props.multiline
    : true;
  const rows = clampRows(("rows" in props ? props.rows : undefined), multiline);
  const placeholder = ("placeholder" in props && props.placeholder !== undefined)
    ? props.placeholder!
    : (multiline ? "長文回答" : "回答を入力");

  const baseAnswerClasses =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 caret-slate-900 outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">回答</label>
      {multiline ? (
        <textarea
          name={name}
          rows={rows}
          disabled={disabled}
          className={`resize-y ${baseAnswerClasses}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
      ) : (
        <input
          name={name}
          type="text"
          disabled={disabled}
          className={baseAnswerClasses}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
      )}
    </div>
  );
}
