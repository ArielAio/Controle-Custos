"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import clsx from "clsx";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "./auth-context";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Entradas & Saídas" },
  { href: "/campaigns", label: "Campanhas" },
  { href: "/payment-methods", label: "Métodos de pagamento" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const auth = getFirebaseAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-semibold">
              Z
            </div>
            <div>
              <p className="text-sm text-slate-500">Zapwrapp</p>
              <p className="text-lg font-semibold text-slate-900">
                Controle de custos
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  {user.email}
                </div>
                <button
                  onClick={() => {
                    if (!auth) return;
                    void signOut(auth);
                  }}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Sair
                </button>
              </>
            ) : (
              <div className="gap-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-sm text-slate-700">
                <span className="rounded-full bg-white px-3 py-1 text-emerald-600">
                  Versão preview
                </span>
                <span className="px-3 py-1 text-slate-600">
                  Firebase + Next.js 14
                </span>
              </div>
            )}
          </div>
        </div>
        <nav className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100",
                )}
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/login"
                className={clsx(
                  "ml-auto rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  pathname === "/login"
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-emerald-700 hover:bg-emerald-50",
                )}
              >
                Login
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
