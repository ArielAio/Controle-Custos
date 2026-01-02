"use client";

import { Suspense, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-context";
import { auth } from "@/lib/firebase";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-500">
            Carregando...
          </div>
        </AppShell>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const redirectTo = params.get("redirect") || "/";

  useEffect(() => {
    if (user) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router, user]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setStatus("loading");
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      setStatus("success");
      router.replace(redirectTo);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("Não foi possível autenticar. Revise as credenciais e o Firebase config.");
    }
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm text-slate-500">Acesso</p>
          <h1 className="text-xl font-semibold text-slate-900">
            Login com Firebase Auth
          </h1>
          <p className="text-xs text-slate-500">
            Use email e senha provisionados no Firebase Authentication.
          </p>
        </div>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              placeholder="seu@email.com"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-rose-600">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              placeholder="••••••••"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-rose-600">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70"
          >
            {status === "loading" ? "Entrando..." : "Entrar"}
          </button>
          {status === "success" ? (
            <p className="text-xs font-semibold text-emerald-700">
              Login realizado! Proteja as rotas com middleware/guards.
            </p>
          ) : null}
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </form>
      </div>
    </AppShell>
  );
}
