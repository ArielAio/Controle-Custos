"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-context";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatCurrencyBRL, formatDate } from "@/lib/format";
import {
  addTransaction as addTransactionFirestore,
  listCampaigns,
  listPaymentMethods,
  listTransactions,
} from "@/lib/firestore";
import { Campaign, PaymentMethod, Transaction, TransactionType } from "@/lib/types";

const transactionSchema = z.object({
  type: z.enum(["entrada", "saida"]),
  amount: z.number().positive(),
  paymentMethodId: z.string(),
  campaignId: z.string().optional(),
  note: z.string().optional(),
  occurredAt: z.string(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function TransactionsPage() {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<TransactionType | "all">("all");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (filterType === "all") return transactions;
    return transactions.filter((t) => t.type === filterType);
  }, [filterType, transactions]);

  const totals = useMemo(() => {
    return {
      entrada: transactions
        .filter((t) => t.type === "entrada")
        .reduce((acc, t) => acc + t.amount, 0),
      saida: transactions
        .filter((t) => t.type === "saida")
        .reduce((acc, t) => acc + t.amount, 0),
    };
  }, [transactions]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "saida",
      amount: 0,
      paymentMethodId: "",
      campaignId: "",
      note: "",
      occurredAt: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      const [pm, camp, tx] = await Promise.all([
        listPaymentMethods(user.uid),
        listCampaigns(user.uid),
        listTransactions(user.uid),
      ]);
      setPaymentMethods(pm);
      setCampaigns(camp);
      setTransactions(tx);
      form.reset({
        ...form.getValues(),
        paymentMethodId: pm[0]?.id ?? "",
        campaignId: "",
      });
      setLoading(false);
    }
    void load();
  }, [user]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!user) return;
    setSaving(true);
    await addTransactionFirestore(user.uid, {
      ...values,
      currency: "BRL",
    });
    const tx = await listTransactions(user.uid);
    setTransactions(tx);
    form.reset({
      type: "saida",
      amount: 0,
      paymentMethodId: paymentMethods[0]?.id ?? "",
      campaignId: "",
      note: "",
      occurredAt: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
  });

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-slate-500">Lançamentos</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Entradas e saídas
            </h1>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total de entradas"
              value={formatCurrencyBRL(totals.entrada)}
              caption="Base Firestore filtrada por usuário"
              tone="positive"
            />
            <KpiCard
              label="Total de saídas"
              value={formatCurrencyBRL(totals.saida)}
              caption="Base Firestore filtrada por usuário"
              tone="negative"
            />
            <KpiCard
              label="Saldo estimado"
              value={formatCurrencyBRL(totals.entrada - totals.saida)}
              caption="Considerando todos os lançamentos"
              tone={totals.entrada - totals.saida >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              label="Campanhas vinculadas"
              value={`${transactions.filter((t) => t.campaignId).length}`}
              caption="Saídas atreladas a campanhas"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center gap-3">
                <button
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    filterType === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                  }`}
                  onClick={() => setFilterType("all")}
                >
                  Tudo
                </button>
                <button
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    filterType === "entrada"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                  }`}
                  onClick={() => setFilterType("entrada")}
                >
                  Entradas
                </button>
                <button
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    filterType === "saida"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                  }`}
                  onClick={() => setFilterType("saida")}
                >
                  Saídas
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                  <div className="p-4 text-sm text-slate-500">Carregando...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">
                    Nenhum lançamento encontrado.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Método</th>
                        <th>Campanha</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => {
                        const pm = paymentMethods.find((pm) => pm.id === t.paymentMethodId);
                        const campaign = campaigns.find((c) => c.id === t.campaignId);
                        return (
                          <tr key={t.id} className="border-t border-slate-100 text-sm">
                            <td className="text-slate-700">{formatDate(t.occurredAt)}</td>
                            <td
                              className={`font-semibold ${
                                t.type === "entrada"
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {t.type === "entrada" ? "Entrada" : "Saída"}
                            </td>
                            <td className="text-slate-700">{pm?.name ?? "—"}</td>
                            <td className="text-slate-700">{campaign?.name ?? "—"}</td>
                            <td
                              className={`font-semibold ${
                                t.type === "entrada"
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {t.type === "saida" ? "-" : "+"}
                              {formatCurrencyBRL(t.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-800">
                  Novo lançamento
                </p>
                <p className="text-xs text-slate-500">
                  Grava direto no Firestore com validação client-side.
                </p>
              </div>
              <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="radio"
                      value="entrada"
                      {...form.register("type")}
                      className="accent-emerald-600"
                    />
                    Entrada
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="radio"
                      value="saida"
                      {...form.register("type")}
                      className="accent-rose-600"
                    />
                    Saída
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    {...form.register("amount", { valueAsNumber: true })}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Método de pagamento
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    {...form.register("paymentMethodId")}
                  >
                    {paymentMethods.length === 0 ? (
                      <option value="">Cadastre um método</option>
                    ) : (
                      paymentMethods.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Campanha (opcional)
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    {...form.register("campaignId")}
                  >
                    <option value="">Sem campanha</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Data</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    {...form.register("occurredAt")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Observação
                  </label>
                  <textarea
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    {...form.register("note")}
                    placeholder="Ex: SaaS, fornecedor, investimento em mídia..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving || paymentMethods.length === 0}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
