"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Vyhľadávanie" },
  { href: "/detect", label: "Detekcia duplikátov" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-baseline gap-2 text-slate-900">
          <span className="text-lg font-semibold tracking-tight">Demagog</span>
          <span className="text-sm font-medium text-slate-500">
            Fact-Check Tool
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-3">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "text-blue-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="relative inline-flex">
                  {item.label}
                  {isActive ? (
                    <span className="absolute -bottom-2 left-0 h-0.5 w-full rounded-full bg-blue-600" />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
