"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-context";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatCurrencyBRL } from "@/lib/format";
import { addPaymentMethod, listPaymentMethods, listTransactions } from "@/lib/firestore";
import { PaymentMethod, Transaction } from "@/lib/types";

const methodSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["cartao", "pix", "boleto", "outro"]),
  active: z.boolean().default(true),
});

type MethodFormValues = z.input<typeof methodSchema>;

export default function PaymentMethodsPage() {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const methodForm = useForm<MethodFormValues>({
    resolver: zodResolver(methodSchema),
    defaultValues: { name: "", type: "cartao", active: true },
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      const [pm, tx] = await Promise.all([
        listPaymentMethods(user.uid),
        listTransactions(user.uid),
      ]);
      setPaymentMethods(pm);
      setTransactions(tx);
      setLoading(false);
    }
    void load();
  }, [user]);

  const totalsByMethod = useMemo(() => {
    return paymentMethods.map((pm) => {
      const related = transactions.filter((t) => t.paymentMethodId === pm.id);
      const entradas = related
        .filter((t) => t.type === "entrada")
        .reduce((acc, t) => acc + t.amount, 0);
      const saidas = related
        .filter((t) => t.type === "saida")
        .reduce((acc, t) => acc + t.amount, 0);

      return { ...pm, entradas, saidas, saldo: entradas - saidas, count: related.length };
    });
  }, [paymentMethods, transactions]);

  const aggregated = totalsByMethod.reduce(
    (acc, pm) => {
      acc.entrada += pm.entradas;
      acc.saida += pm.saidas;
      acc.total += pm.saldo;
      return acc;
    },
    { entrada: 0, saida: 0, total: 0 },
  );

  const handleCreate = methodForm.handleSubmit(async (values) => {
    if (!user) return;
    setSaving(true);
    const payload = methodSchema.parse(values);
    await addPaymentMethod(user.uid, payload);
    const [pm, tx] = await Promise.all([
      listPaymentMethods(user.uid),
      listTransactions(user.uid),
    ]);
    setPaymentMethods(pm);
    setTransactions(tx);
    methodForm.reset({ name: "", type: "cartao", active: true });
    setSaving(false);
  });

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-slate-500">Métodos de pagamento</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Cartões, PIX e boletos
            </h1>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Saldo consolidado"
              value={formatCurrencyBRL(aggregated.total)}
              caption="Entradas - saídas por método"
              tone={aggregated.total >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              label="Entradas"
              value={formatCurrencyBRL(aggregated.entrada)}
              caption="Somatório de crédito"
              tone="positive"
            />
            <KpiCard
              label="Saídas"
              value={formatCurrencyBRL(aggregated.saida)}
              caption="Somatório de débito"
              tone="negative"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">Carregando...</div>
            ) : paymentMethods.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                Nenhum método cadastrado ainda. Crie pelo Firestore.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 p-4">
                {totalsByMethod.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{pm.name}</p>
                        <p className="text-xs text-slate-500">{pm.type}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          pm.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {pm.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Entradas</p>
                        <p className="font-semibold text-emerald-700">
                          {formatCurrencyBRL(pm.entradas)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Saídas</p>
                        <p className="font-semibold text-rose-700">
                          {formatCurrencyBRL(pm.saidas)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Saldo</p>
                        <p
                          className={`font-semibold ${
                            pm.saldo >= 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {formatCurrencyBRL(pm.saldo)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {pm.count} lançamentos vinculados
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-800">
                Novo método de pagamento
              </p>
              <p className="text-xs text-slate-500">
                Grava direto na coleção paymentMethods com o seu UID.
              </p>
            </div>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={handleCreate}>
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-slate-600">Nome</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="Ex: Cartão BB"
                  {...methodForm.register("name")}
                />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-slate-600">Tipo</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  {...methodForm.register("type")}
                >
                  <option value="cartao">Cartão</option>
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div className="flex items-end md:col-span-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Adicionar método"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
