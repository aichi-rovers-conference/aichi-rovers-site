"use client";

import { useEffect, useState } from "react";

type Props = {
  fallbackRole: string;
  fallbackSuper?: boolean;
};

export default function ClientRole({ fallbackRole, fallbackSuper }: Props) {
  const [label, setLabel] = useState(
    fallbackRole + (fallbackSuper ? " / SUPER" : "")
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/status", {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;

        const isSuper =
          j.isSuper === true || j.isSuper === 1 || j.isSuper === "1" || j.isSuper === "true";
        const next = String(j.role) + (isSuper ? " / SUPER" : "");
        setLabel(next);
      } catch {
        // 失敗時はフォールバックのまま
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return <>{label}</>;
}
