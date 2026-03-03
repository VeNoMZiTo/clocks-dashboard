"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/clocks", label: "Relojes", icon: "🕐" },
  { href: "/oportunidades", label: "Oportunidades", icon: "✨" }
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-6 py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-xs transition ${
                active ? "text-emerald-300" : "text-zinc-500"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="uppercase tracking-[0.2em]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
