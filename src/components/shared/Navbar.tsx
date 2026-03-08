"use client";

import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex h-24 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center text-slate-900 dark:text-slate-100">
          <Image
            src="/demagog-logo.png"
            alt="Demagog.sk"
            width={204}
            height={80}
            className="h-[5rem] w-auto object-contain dark:invert"
            priority
          />
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
