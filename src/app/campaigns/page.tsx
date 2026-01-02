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
import { addCampaign, listCampaigns, listTransactions } from "@/lib/firestore";
import { Campaign, Transaction } from "@/lib/types";

const campaignSchema = z.object({
  name: z.string().min(2),
  platform: z.string().min(2),
  objective: z.string().min(2),
  budget: z.number().nonnegative(),
  spent: z.number().nonnegative(),
  periodStart: z.string(),
  periodEnd: z.string(),
  status: z.enum(["ativa", "pausada", "encerrada"]),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      platform: "Meta Ads",
      objective: "",
      budget: 0,
      spent: 0,
      periodStart: new Date().toISOString().slice(0, 10),
      periodEnd: new Date().toISOString().slice(0, 10),
      status: "ativa",
    },
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      const [camp, tx] = await Promise.all([
        listCampaigns(user.uid),
        listTransactions(user.uid),
      ]);
      setCampaigns(camp);
      setTransactions(tx);
      setLoading(false);
    }
    void load();
  }, [user]);

  const totals = useMemo(() => {
    const spend = campaigns.reduce((acc, c) => acc + c.spent, 0);
    const budget = campaigns.reduce((acc, c) => acc + c.budget, 0);
    const linkedTransactions = transactions.filter((t) => t.campaignId);
    return {
      spend,
      budget,
      linked: linkedTransactions.length,
      active: campaigns.filter((c) => c.status === "ativa").length,
    };
  }, [campaigns, transactions]);

  const handleCreate = form.handleSubmit(async (values) => {
    if (!user) return;
    setSaving(true);
    await addCampaign(user.uid, values);
    const [camp, tx] = await Promise.all([
      listCampaigns(user.uid),
      listTransactions(user.uid),
    ]);
    setCampaigns(camp);
    setTransactions(tx);
    form.reset({
      name: "",
      platform: "Meta Ads",
      objective: "",
      budget: 0,
      spent: 0,
      periodStart: new Date().toISOString().slice(0, 10),
      periodEnd: new Date().toISOString().slice(0, 10),
      status: "ativa",
    });
    setSaving(false);
  });

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-slate-500">Campanhas</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Investimentos em mídia paga
            </h1>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Orçamento total"
              value={formatCurrencyBRL(totals.budget)}
              caption="Soma de todos os orçamentos"
            />
            <KpiCard
              label="Gasto atual"
              value={formatCurrencyBRL(totals.spend)}
              caption="Base Firestore"
              tone="negative"
            />
            <KpiCard
              label="Campanhas ativas"
              value={`${totals.active}`}
              caption="Meta Ads, Google, TikTok"
            />
            <KpiCard
              label="Saídas vinculadas"
              value={`${totals.linked}`}
              caption="Transações ligadas a campanhas"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">Carregando...</div>
            ) : campaigns.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                Nenhuma campanha cadastrada ainda.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Campanha</th>
                    <th>Plataforma</th>
                    <th>Objetivo</th>
                    <th>Período</th>
                    <th>Orçado</th>
                    <th>Gasto</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100 text-sm">
                      <td className="font-semibold text-slate-800">{c.name}</td>
                      <td className="text-slate-700">{c.platform}</td>
                      <td className="text-slate-700">{c.objective}</td>
                      <td className="text-slate-700">
                        {formatDate(c.periodStart)} → {formatDate(c.periodEnd)}
                      </td>
                      <td className="font-semibold text-slate-800">
                        {formatCurrencyBRL(c.budget)}
                      </td>
                      <td className="font-semibold text-slate-800">
                        {formatCurrencyBRL(c.spent)}
                      </td>
                      <td>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            c.status === "ativa"
                              ? "bg-emerald-100 text-emerald-700"
                              : c.status === "pausada"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-800">Nova campanha</p>
              <p className="text-xs text-slate-500">
                Grava direto na coleção campaigns com o seu UID.
              </p>
            </div>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={handleCreate}>
              <div>
                <label className="text-xs font-medium text-slate-600">Nome</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="Ex: Lançamento Q2"
                  {...form.register("name")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Plataforma</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="Meta Ads, Google Ads..."
                  {...form.register("platform")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Objetivo</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="Leads, conversões..."
                  {...form.register("objective")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Orçamento</label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  {...form.register("budget", { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Gasto atual</label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  {...form.register("spent", { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Status</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  {...form.register("status")}
                >
                  <option value="ativa">Ativa</option>
                  <option value="pausada">Pausada</option>
                  <option value="encerrada">Encerrada</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Início</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  {...form.register("periodStart")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Fim</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  {...form.register("periodEnd")}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Adicionar campanha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
