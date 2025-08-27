// src/app/polls/admin/users/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import ScrollProgressBar from "../../polls/ScrollProgressBar";
import { XCircle, CheckCircle2, Lock, Eye, EyeOff, KeyRound, Power, MoreVertical } from "lucide-react";
import ArcHeader from "@/src/components/ArcHeader";

type Role = "ADMIN" | "EDITOR" | "VIEWER";
type Status = { id: number; username: string; role: Role; isSuper: boolean };

type UserRow = {
  id: number;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function UsersAdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Status | null>(null);
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");

  // 認証 → 一覧取得。401はログイン誘導、403は画面に表示（/execへ勝手に戻さない）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) 自分のステータス
        const s = await fetch("/api/auth/status", {
          cache: "no-store",
          credentials: "include", // ★ cookie を確実に送る
          headers: { Accept: "application/json" },
        });

        if (s.status === 401) {
          router.replace(`/login?next=${encodeURIComponent("/polls/admin/users")}&auth=required`);
          return;
        }
        if (!s.ok) {
          if (!alive) return;
          setError((await s.text().catch(() => "")) || "認証情報の取得に失敗しました");
          setLoading(false);
          return;
        }

        const meJson = (await s.json()) as Status;
        if (!alive) return;
        setMe(meJson);

        // 2) ユーザー一覧
        const r = await fetch("/api/admin/users", {
          cache: "no-store",
          credentials: "include", // ★ cookie を確実に送る
          headers: { Accept: "application/json" },
        });

        if (r.status === 401) {
          router.replace(`/login?next=${encodeURIComponent("/polls/admin/users")}&auth=expired`);
          return;
        }
        if (r.status === 403) {
          if (!alive) return;
          setError("このページを閲覧する権限がありません（ADMIN/SUPERのみ）");
          setList([]);
          setLoading(false);
          return;
        }
        if (!r.ok) {
          if (!alive) return;
          setError((await r.text().catch(() => "")) || "ユーザー一覧の取得に失敗しました");
          setList([]);
          setLoading(false);
          return;
        }

        const data = await r.json();
        if (!alive) return;
        setList((data.items as UserRow[]) || []);
        setError("");
        setLoading(false);
      } catch {
        if (!alive) return;
        setError("通信エラーが発生しました");
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter((u) =>
      [u.username, u.role, u.isActive ? "active" : "inactive"].join(" ").toLowerCase().includes(k)
    );
  }, [q, list]);

  const canOperate = !!me?.isSuper;

  const createUser = async (form: { username: string; role: Role; password?: string }) => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        setError("セッションが切れました。再ログインしてください。");
        return;
      }
      if (res.status === 403) {
        setError("この操作にはSUPER権限が必要です");
        return;
      }
      if (!res.ok) throw new Error("作成に失敗しました（SUPER権限が必要です）");
      const json = await res.json();
      setList((prev) => [json.user as UserRow, ...prev]);
      alert(`ユーザーを作成しました。\nusername: ${json.user.username}\n一時パスワード: ${json.tempPassword}`);
    } catch (e: any) {
      setError(e?.message ?? "エラーが発生しました");
    } finally {
      setCreating(false);
    }
  };

  const patchUser = async (id: number, patch: any, note = "更新しました") => {
    setError("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (res.status === 401) {
      setError("セッションが切れました。再ログインしてください。");
      return;
    }
    if (res.status === 403) {
      alert("この操作にはSUPER権限が必要です");
      return;
    }
    if (!res.ok) {
      const t = await res.text();
      alert(`失敗: ${t || res.status}`);
      return;
    }
    const json = await res.json();
    setList((prev) => prev.map((u) => (u.id === id ? { ...u, ...json.user } : u)));
    if (json.tempPassword) {
      alert(`一時パスワードを再発行しました: ${json.tempPassword}`);
    } else {
      alert(note);
    }
  };

  const deleteUser = async (id: number) => {
    setError("");
    if (!confirm("このユーザーを削除します。よろしいですか？\n※ この操作は取り消せません")) return;

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json", Accept: "application/json" },
      credentials: "include",
    });
    if (res.status === 401) {
      setError("セッションが切れました。再ログインしてください。");
      return;
    }
    if (res.status === 403) {
      alert("この操作にはSUPER権限が必要です");
      return;
    }
    if (!res.ok) {
      const t = await res.text();
      alert(`削除に失敗: ${t || res.status}`);
      return;
    }
    setList((prev) => prev.filter((u) => u.id !== id));
    alert("削除しました");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-slate-50">
        <ScrollProgressBar />
        <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/images/ARClogo.png" alt="ARC logo" width={28} height={28} />
              <span className="text-base font-semibold tracking-tight">ARCアンケート</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-xl font-semibold">ユーザー管理</h1>
          <p className="mt-2 text-slate-500 text-sm">読み込み中…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-slate-50 text-slate-900">
      <ScrollProgressBar />
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">ユーザー管理</h1>
            {me && (
              <p className="mt-1 text-sm text-slate-500">
                ログイン中: <b>{me.username}</b>（{me.role}
                {me.isSuper ? " / SUPER" : ""}）
              </p>
            )}
          </div>
        </div>

        <section className="mt-6 rounded-2xl bg-white/90 ring-1 ring-slate-200 shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">検索</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                placeholder="username / role / active"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {canOperate && <NewUserForm creating={creating} onCreate={createUser} />}
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </section>

        <section className="mt-6 rounded-2xl overflow-hidden bg-white/95 ring-1 ring-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm table-fixed">
              <colgroup>
                <col className="w-20" />
                <col />
                <col className="w-40" />
                <col className="w-36" />
                <col className="w-56 md:w-72 lg:w-[22rem] xl:w-[28rem]" />
              </colgroup>
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-700">
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">ユーザー名</th>
                  <th className="px-4 py-2">ロール</th>
                  <th className="px-4 py-2">状態</th>
                  <th className="px-4 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-slate-200 hover:bg-slate-50/60">
                    <td className="px-4 py-2">{u.id}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{u.username}</td>
                    <td className="px-4 py-2">
                      {canOperate ? (
                        <select
                          className="rounded-md border border-slate-300 bg-white px-2 py-1"
                          value={u.role}
                          onChange={(e) => patchUser(u.id, { role: e.target.value }, "ロールを更新しました")}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      ) : (
                        <span>{u.role}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                          <XCircle className="h-3.5 w-3.5" />
                          inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {canOperate ? (
                        <ActionCell
                          isActive={u.isActive}
                          username={u.username}
                          disableDelete={me?.id === u.id}
                          onToggle={() => {
                            void patchUser(
                              u.id,
                              { isActive: !u.isActive },
                              u.isActive ? "無効化しました" : "有効化しました"
                            );
                          }}
                          onReset={() => {
                            void patchUser(u.id, { resetPassword: true });
                          }}
                          onSetPassword={(pwd) => {
                            void patchUser(u.id, { newPassword: pwd }, "パスワードを変更しました");
                          }}
                          onDelete={() => {
                            void deleteUser(u.id);
                          }}
                        />
                      ) : (
                        <span className="text-slate-400">閲覧のみ</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                      該当ユーザーがいません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function NewUserForm({
  creating,
  onCreate,
}: {
  creating: boolean;
  onCreate: (p: { username: string; role: Role; password?: string }) => void;
}) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("EDITOR");
  const [password, setPassword] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onCreate({ username: username.trim(), role, password: password.trim() || undefined });
        setUsername("");
        setPassword("");
        setRole("EDITOR");
      }}
    >
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">ユーザー名</label>
        <input
          className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">ロール</label>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="ADMIN">ADMIN</option>
          <option value="EDITOR">EDITOR</option>
          <option value="VIEWER">VIEWER</option>
        </select>
      </div>
      <div className="min-w-[14rem]">
        <label className="block text-xs font-medium text-slate-500 mb-1">（任意）初期パスワード</label>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          placeholder="空欄なら自動生成"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button
        disabled={creating}
        className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50"
      >
        {creating ? "作成中…" : "ユーザー作成"}
      </button>
    </form>
  );
}

/* ---- 操作セル（パスワード変更モーダル付き） ---- */
function ActionCell({
  isActive,
  username,
  disableDelete,
  onToggle,
  onReset,
  onSetPassword,
  onDelete,
}: {
  isActive: boolean;
  username: string;
  disableDelete?: boolean;
  onToggle: () => void;
  onReset: () => void;
  onSetPassword: (pwd: string) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 200 });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [pwErr, setPwErr] = useState<string>("");

  const [delOpen, setDelOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const updatePosition = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = 200;
    const margin = 8;
    const left = Math.min(window.innerWidth - width - margin, Math.max(margin, rect.left));
    const top = Math.min(window.innerHeight - 160 - margin, rect.bottom + 8);
    setPos({ top, left, width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const isInsideRefs = (target: Node | null) =>
      (!!btnRef.current && !!target && btnRef.current.contains(target)) ||
      (!!menuRef.current && !!target && menuRef.current.contains(target));
    const onDocMouse = (e: MouseEvent) => { const t = e.target as Node | null; if (!isInsideRefs(t)) setOpen(false); };
    const onDocTouch = (e: TouchEvent) => { const t = e.target as Node | null; if (!isInsideRefs(t)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = () => setOpen(false);
    const onResize = () => updatePosition();

    document.addEventListener("mousedown", onDocMouse);
    document.addEventListener("touchstart", onDocTouch, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDocMouse);
      document.removeEventListener("touchstart", onDocTouch);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const baseBtn =
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100";
  const ghost = `${baseBtn} border-slate-300 bg-white text-slate-800 font-medium hover:bg-slate-50`;
  const primary =
    "inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-sm text-white font-medium shadow-sm hover:opacity-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200";
  const danger =
    "inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white font-semibold shadow-sm hover:opacity-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:opacity-50";

  const submitChange = () => {
    const a = pw1.trim();
    const b = pw2.trim();
    if (a.length < 8) return setPwErr("8文字以上で入力してください");
    if (a.length > 128) return setPwErr("128文字以内で入力してください");
    if (a !== b) return setPwErr("確認用と一致しません");
    setPwErr("");
    onSetPassword(a);
    setPw1(""); setPw2("");
    setPwOpen(false);
  };

  return (
    <div className="flex items-center">
      {/* md以上: 4ボタン */}
      <div className="hidden md:flex items-center gap-3">
        <button className={ghost} onClick={onToggle} title={isActive ? "無効化" : "有効化"} type="button">
          <Power className="h-4 w-4" />
          <span>{isActive ? "無効化" : "有効化"}</span>
        </button>
        <button className={primary} onClick={onReset} title="パス再発行" type="button">
          <KeyRound className="h-4 w-4" />
          <span>パス再発行</span>
        </button>
        <button className={ghost} onClick={() => setPwOpen(true)} title="パスワード変更" type="button">
          <Lock className="h-4 w-4" />
          <span>パス変更</span>
        </button>
        <button
          className={danger}
          onClick={() => setDelOpen(true)}
          title="ユーザー削除"
          type="button"
          disabled={disableDelete}
        >
          <XCircle className="h-4 w-4" />
          <span>削除</span>
        </button>
      </div>

      {/* モバイル: ドロップダウン */}
      <div className="relative md:hidden">
        <button
          ref={btnRef}
          className={`${ghost} inline-flex flex-row items-center gap-1 whitespace-nowrap [writing-mode:horizontal-tb] [text-orientation:mixed]`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          type="button"
        >
          <MoreVertical className="h-4 w-4 shrink-0" />
          <span className="leading-none whitespace-nowrap [writing-mode:horizontal-tb] [text-orientation:mixed]">操作</span>
        </button>

        {mounted && open && createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[101] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <button role="menuitem" type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 font-medium hover:bg-slate-50"
                onClick={() => { setOpen(false); onToggle(); }}>
                <Power className="h-4 w-4" />
                <span>{isActive ? "無効化" : "有効化"}</span>
              </button>
              <button role="menuitem" type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 font-medium hover:bg-slate-50"
                onClick={() => { setOpen(false); onReset(); }}>
                <KeyRound className="h-4 w-4" />
                <span>パス再発行</span>
              </button>
              <button role="menuitem" type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 font-medium hover:bg-slate-50"
                onClick={() => { setOpen(false); setPwOpen(true); }}>
                <Lock className="h-4 w-4" />
                <span>パス変更</span>
              </button>
              {!disableDelete && (
                <button role="menuitem" type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-700 font-semibold hover:bg-rose-50"
                  onClick={() => { setOpen(false); setDelOpen(true); }}>
                  <XCircle className="h-4 w-4" />
                  <span>削除</span>
                </button>
              )}
            </div>
          </>,
          document.body
        )}
      </div>

      {/* パスワード変更モーダル */}
      {mounted && pwOpen && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 z-[120]" onClick={() => setPwOpen(false)} />
          <div
            className="relative z-[121] w-[92%] max-w-md rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-xl"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">パスワード変更</h3>
              <p className="mt-1 text-sm text-slate-700">8〜128文字。変更は即時に有効になります。</p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); submitChange(); }}
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="new-password">
                  新しいパスワード
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={show1 ? "text" : "password"}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    minLength={8}
                    maxLength={128}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 inline-flex items-center"
                    aria-label={show1 ? "パスワードを隠す" : "パスワードを表示"}
                    onClick={() => setShow1(v => !v)}
                  >
                    {show1 ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="new-password-2">
                  新しいパスワード（確認）
                </label>
                <div className="relative">
                  <input
                    id="new-password-2"
                    type={show2 ? "text" : "password"}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    minLength={8}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 inline-flex items-center"
                    aria-label={show2 ? "パスワードを隠す" : "パスワードを表示"}
                    onClick={() => setShow2(v => !v)}
                  >
                    {show2 ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                  </button>
                </div>
              </div>

              {pwErr && <p className="text-sm text-rose-600" role="alert">{pwErr}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  onClick={() => { setPwOpen(false); setPwErr(""); }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                >
                  変更する
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 削除確認モーダル */}
      {mounted && delOpen && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDelOpen(false)} />
          <div className="relative z-[121] w-[92%] max-w-md rounded-2xl bg-white p-6 ring-1 ring-rose-200 shadow-xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">ユーザー削除</h3>
              <p className="mt-1 text-sm text-slate-700">
                <b className="text-rose-700">{username}</b> を削除します。<br />
                この操作は取り消せません。よろしいですか？
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => setDelOpen(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className={danger}
                onClick={() => { setDelOpen(false); onDelete(); }}
                disabled={disableDelete}
              >
                削除する
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
