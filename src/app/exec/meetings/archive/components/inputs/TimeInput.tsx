// src/components/inputs/TimeInput.tsx
"use client";

import React from "react";

type Props = {
  value?: string | null;                 // "HH:MM"
  onChange: (v: string) => void;         // 常に "HH:MM"
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  placeholder?: string;                  // 既定: "--:--"
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function digitsFrom(value?: string | null): number[] {
  const s = String(value ?? "");
  const ds = (s.match(/\d/g) ?? []).map((c) => Number(c)).slice(0, 4);
  return ds;
}

function fmtDisplay(ds: number[]) {
  const a = ds[0] ?? "-";
  const b = ds[1] ?? "-";
  const c = ds[2] ?? "-";
  const d = ds[3] ?? "-";
  return `${a}${b}:${c}${d}`;
}

function toHM(ds: number[], pad = false): { h: number; m: number } | null {
  if (!pad && ds.length < 4) return null;
  const d = [...ds];
  while (d.length < 4) d.push(0);
  let hh = d[0] * 10 + d[1];
  let mm = d[2] * 10 + d[3];
  hh = clamp(hh, 0, 23);
  mm = clamp(mm, 0, 59);
  return { h: hh, m: mm };
}
function hmToStr(h: number, m: number) {
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${p2(h)}:${p2(m)}`;
}

export default function TimeInput({
  value,
  onChange,
  className = "",
  disabled,
  name,
  id,
  placeholder = "--:--",
}: Props) {
  const [ds, setDs] = React.useState<number[]>(digitsFrom(value));
  const ref = React.useRef<HTMLInputElement>(null);

  // 外部値の変更を取り込む
  React.useEffect(() => {
    const ext = digitsFrom(value);
    // 文字→digitsに変換した結果が内部と違うときだけ同期
    if (ext.join("") !== ds.join("")) setDs(ext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commitIfComplete = (next: number[]) => {
    if (next.length >= 4) {
      const hm = toHM(next, true)!;
      onChange(hmToStr(hm.h, hm.m));
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (disabled) return;
    const key = e.key;

    // 数字: 末尾に追加（4桁超過で左にシフト）
    if (/^\d$/.test(key)) {
      e.preventDefault();
      const nds = ds.length < 4 ? [...ds, Number(key)] : [...ds.slice(1), Number(key)];
      setDs(nds);
      commitIfComplete(nds);
      return;
    }

    if (key === "Backspace") {
      e.preventDefault();
      if (ds.length === 0) return;
      const nds = ds.slice(0, -1);
      setDs(nds);
      // 不完全時は未コミット（blur時にコミット）
      return;
    }

    if (key === "Delete") {
      e.preventDefault();
      setDs([]);
      return;
    }

    if (key === "ArrowUp" || key === "ArrowDown") {
      e.preventDefault();
      const hm = toHM(ds, true) ?? { h: 0, m: 0 };
      const step = e.shiftKey ? 5 : 1;
      let total = hm.h * 60 + hm.m + (key === "ArrowUp" ? step : -step);
      // 0〜1439 分でループ
      total = (total + 1440) % 1440;
      const nh = Math.floor(total / 60);
      const nm = total % 60;
      onChange(hmToStr(nh, nm));
      setDs(digitsFrom(hmToStr(nh, nm)));
      return;
    }

    if (key === "Enter" || key === "Tab") {
      // 不完全でも0でパディングして確定
      const hm = toHM(ds, true);
      if (hm) {
        onChange(hmToStr(hm.h, hm.m));
        setDs(digitsFrom(hmToStr(hm.h, hm.m)));
      }
      return; // Tab自体の移動はブラウザに任せたい→preventDefaultしない
    }
  };

  const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    if (disabled) return;
    const text = e.clipboardData.getData("text") ?? "";
    const onlyDigits = (text.match(/\d/g) ?? []).slice(0, 4).map(Number);
    if (onlyDigits.length > 0) {
      e.preventDefault();
      const hm = toHM(onlyDigits, true)!;
      const s = hmToStr(hm.h, hm.m);
      onChange(s);
      setDs(digitsFrom(s));
    }
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    // 不完全でも確定（0パディング）
    const hm = toHM(ds, true);
    if (hm) {
      const s = hmToStr(hm.h, hm.m);
      onChange(s);
      setDs(digitsFrom(s));
    }
  };

  const handleMouseDown: React.MouseEventHandler<HTMLInputElement> = (e) => {
    // どこをクリックしても最初から入力開始：選択状態にする
    e.preventDefault();
    ref.current?.focus();
    // 全選択（視覚的にも分かりやすい）
    setTimeout(() => ref.current?.setSelectionRange(0, 5), 0);
  };

  const display = ds.length ? fmtDisplay(ds) : placeholder;

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      aria-label="時刻（HH:MM）"
      className={`w-[120px] rounded-lg border px-3 py-2 font-mono tabular-nums tracking-widest text-slate-900
                  placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 ${className}`}
      value={display}
      onChange={() => { /* 直接は書き換えない（keydownで制御） */ }}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onBlur={handleBlur}
      onMouseDown={handleMouseDown}
      disabled={disabled}
    />
  );
}
