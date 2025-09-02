"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

type District =
  | "NAGOYA_CHIKUSA"
  | "NAGOYA_SEIBU"
  | "NAGOYA_HOKUTO"
  | "NAGOYA_TATSUMI"
  | "OWARI_NISHI"
  | "OWARI_HIGASHI"
  | "OWARI_MINAMI"
  | "CHITA_HOKUBU"
  | "CHITA_HIGASHI"
  | "CHITA_SEINAN"
  | "TOYOTA"
  | "MIKAWA_AOI"
  | "HEKIKAI"
  | "HONOKUNI"
  | "OTHERS";

const DISTRICT_OPTIONS: Array<{ value: District; label: string }> = [
  { value: "NAGOYA_CHIKUSA", label: "名古屋千種地区" },
  { value: "NAGOYA_SEIBU", label: "名古屋西部地区" },
  { value: "NAGOYA_HOKUTO", label: "名古屋北斗地区" },
  { value: "NAGOYA_TATSUMI", label: "名古屋巽地区" },
  { value: "OWARI_NISHI", label: "尾張西地区" },
  { value: "OWARI_HIGASHI", label: "尾張東地区" },
  { value: "OWARI_MINAMI", label: "尾張南地区" },
  { value: "CHITA_HOKUBU", label: "知多北部地区" },
  { value: "CHITA_HIGASHI", label: "知多東地区" },
  { value: "CHITA_SEINAN", label: "知多西南地区" },
  { value: "TOYOTA", label: "豊田地区" },
  { value: "MIKAWA_AOI", label: "三河葵地区" },
  { value: "HEKIKAI", label: "碧海地区" },
  { value: "HONOKUNI", label: "穂の国地区" },
  { value: "OTHERS", label: "その他地区" },
];

export default function RegisterParticipantPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [troop, setTroop] = useState("");
  const [rsAge, setRsAge] = useState<number | "">("");
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState<District | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [redirectSec, setRedirectSec] = useState<number | null>(null); // ← 成功後のカウントダウン

  // 成功後にカウントダウンしてホームへ遷移
  useEffect(() => {
    if (redirectSec == null) return;
    if (redirectSec <= 0) {
      router.push("/");
      return;
    }
    const iv = setInterval(() => setRedirectSec((s) => (s == null ? null : s - 1)), 1000);
    return () => clearInterval(iv);
  }, [redirectSec, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    // かんたんクライアント側バリデーション
    if (!name.trim() || !troop.trim() || rsAge === "" || !district) {
      setMessage({ type: "error", text: "必須項目を入力してください。" });
      return;
    }
    if (typeof rsAge !== "number" || Number.isNaN(rsAge)) {
      setMessage({ type: "error", text: "RS年齢は数値で入力してください。" });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: "error", text: "メールアドレスの形式が正しくありません。" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          troop: troop.trim(),
          rsAge: typeof rsAge === "number" ? rsAge : Number(rsAge),
          email: email.trim() || null, // 空文字は null へ
          district,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text:
            data?.error ??
            (res.status === 409
              ? "このメールアドレスは既に登録されています。"
              : "登録に失敗しました。しばらくしてからもう一度お試しください。"),
        });
      } else {
        setMessage({
          type: "success",
          text: "登録が完了しました。ご協力ありがとうございます！ 3秒後にホームへ移動します。",
        });
        // フォームはクリアして再送信防止
        setName("");
        setTroop("");
        setRsAge("");
        setEmail("");
        setDistrict("");
        setRedirectSec(3); // ← カウント開始
      }
    } catch (err) {
      setMessage({ type: "error", text: "ネットワークエラーが発生しました。" });
    } finally {
      setSubmitting(false);
    }
  }

  const success = message?.type === "success";

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">定例会 参加者登録</h1>
        <p className="mt-2 text-sm text-slate-600">
          以下のフォームにご記入ください。<br />
          メールアドレスは任意です（QR配布等の連絡に使用しますが、公開はしません）。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <fieldset disabled={submitting || success} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">氏名（必須）</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="山田太郎"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">所属団（必須）</label>
              <input
                type="text"
                value={troop}
                onChange={(e) => setTroop(e.currentTarget.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="名古屋○○○団"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">RS年齢（必須・数字）</label>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={rsAge}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setRsAge(v === "" ? "" : Number(v));
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="半角数字"
                required
              />
              <p className="mt-1 text-xs text-slate-500">半角数字で入力</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">メールアドレス（任意）</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="例：name@example.com"
              />
              <p className="mt-1 text-xs text-slate-500">未入力でもOKです</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">所属地区（必須）</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.currentTarget.value as District)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="" disabled>
                  選択してください
                </option>
                {DISTRICT_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          {message && (
            <div
              className={
                message.type === "success"
                  ? "rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700"
                  : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700"
              }
              role="alert"
            >
              <p>{message.text}</p>
              {message.type === "success" && redirectSec != null && (
                <p className="mt-1 text-sm">
                  自動でホームへ移動します（<span className="font-semibold">{redirectSec}</span>）
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || success}
              className={`rounded-xl px-4 py-2 font-semibold text-white shadow-sm ${
                submitting || success ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              {submitting ? "送信中…" : success ? "完了" : "登録する"}
            </button>

            {/* 成功時は手動で戻りたい人向けの導線 */}
            {success && (
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-sm text-slate-600 underline-offset-2 hover:underline"
              >
                今すぐホームへ戻る
              </button>
            )}
          </div>
        </form>

        <p className="mt-6 text-xs leading-6 text-slate-500">
          個人情報はARC運営にのみ利用し、公開しません。詳しくはプライバシーポリシーをご確認ください。
        </p>
      </div>
    </main>
  );
}
