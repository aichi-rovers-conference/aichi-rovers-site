"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserPlus, Database } from "lucide-react";

export default function ParticipantsNav({ className = "" }: { className?: string }) {
  const pathname = usePathname() || "";

  const items = [
    { href: "/exec/participants/register", label: "新規登録", Icon: UserPlus },
    { href: "/exec/participants/manage",  label: "閲覧・編集", Icon: Database },
  ] as const;

  const base =
    "inline-flex items-center gap-2 rounded-xl px-5 h-11 text-sm md:text-[0.95rem] font-medium ring-1 ring-inset transition";

  return (
    <nav className={`flex flex-wrap gap-3 ${className}`}>
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");

        // アクティブ時は押せない・濃色に
        if (active) {
          return (
            <span
              key={href}
              aria-current="page"
              className={`${base} cursor-default pointer-events-none bg-gray-900 text-white ring-gray-900 shadow`}
              title={label}
            >
              <Icon className="size-4" />
              {label}
            </span>
          );
        }

        // 非アクティブ時は通常ボタン
        return (
          <Link
            key={href}
            href={href}
            className={`${base} bg-white text-gray-800 ring-gray-200 hover:shadow hover:bg-gray-50`}
            title={label}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
