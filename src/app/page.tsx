"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { ChartCard } from "@/components/ui/chart-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatCurrencyBRL, formatDate } from "@/lib/format";
import { useAuth } from "@/components/auth-context";
import {
  listCampaigns,
  listPaymentMethods,
  listTransactions,
} from "@/lib/firestore";
import { Campaign, PaymentMethod, TimelinePoint, Transaction } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

function buildTimeline(tx: Transaction[]): TimelinePoint[] {
  const buckets = new Map<string, { entrada: number; saida: number }>();
  tx.forEach((t) => {
    const date = new Date(t.occurredAt);
    const label = date.toLocaleDateString("pt-BR", { month: "short" });
    const bucket = buckets.get(label) ?? { entrada: 0, saida: 0 };
    if (t.type === "entrada") bucket.entrada += t.amount;
    else bucket.saida += t.amount;
    buckets.set(label, bucket);
  });
  return Array.from(buckets.entries()).map(([label, values]) => ({
    label,
    entrada: values.entrada,
    saida: values.saida,
  }));
}

export default function Home() {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
    void load();
  }, [user]);

  const totalEntrada = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "entrada")
        .reduce((acc, t) => acc + t.amount, 0),
    [transactions],
  );
  const totalSaida = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "saida")
        .reduce((acc, t) => acc + t.amount, 0),
    [transactions],
  );
  const saldo = totalEntrada - totalSaida;
  const activeCampaigns = campaigns.filter((c) => c.status === "ativa").length;
  const adsSpend = campaigns.reduce((acc, c) => acc + c.spent, 0);

  const recentTransactions = [...transactions]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5);

  const paymentBreakdown = paymentMethods.map((pm) => ({
    ...pm,
    total: transactions
      .filter((t) => t.paymentMethodId === pm.id)
      .reduce((acc, t) => acc + t.amount * (t.type === "saida" ? -1 : 1), 0),
  }));

  const timeline = buildTimeline(transactions);
  const spendByCampaign = campaigns.map((c) => ({
    name: c.name,
    spent: c.spent,
  }));
  const spendByMethod = paymentMethods.map((pm) => ({
    name: pm.name,
    value: transactions
      .filter((t) => t.paymentMethodId === pm.id && t.type === "saida")
      .reduce((acc, t) => acc + t.amount, 0),
  }));
  const methodColors = ["#0ea5e9", "#8b5cf6", "#f43f5e", "#22c55e", "#f59e0b"];

  if (loading) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="p-6 text-sm text-slate-600">Carregando dados...</div>
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Visão geral</p>
              <h1 className="text-2xl font-semibold text-slate-900">
                Custos e campanhas do Zapwrapp
              </h1>
            </div>
            <Link
              href="/transactions"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Registrar entrada/saída
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Saldo projetado"
              value={formatCurrencyBRL(saldo)}
              caption="Entradas - saídas do período"
              tone={saldo >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              label="Total de entradas"
              value={formatCurrencyBRL(totalEntrada)}
              caption="Inclui recorrência e projetos avulsos"
              tone="positive"
            />
            <KpiCard
              label="Total de saídas"
              value={formatCurrencyBRL(totalSaida)}
              caption="Operação + mídia"
              tone="negative"
            />
            <KpiCard
              label="Campanhas ativas"
              value={`${activeCampaigns}`}
              caption={`Investimento atual: ${formatCurrencyBRL(adsSpend)}`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Linha do tempo de caixa"
              description="Entradas e saídas mês a mês"
              action={
                <Link
                  href="/transactions"
                  className="text-xs font-semibold text-emerald-700"
                >
                  Abrir lançamentos
                </Link>
              }
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis dataKey="label" tickLine={false} />
                  <Tooltip
                    formatter={(value) =>
                      formatCurrencyBRL(
                        typeof value === "number" ? value : Number(value ?? 0),
                      )
                    }
                    contentStyle={{
                      borderRadius: "12px",
                      borderColor: "#cbd5e1",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="entrada"
                      stroke="#0284c7"
                      fillOpacity={1}
                      fill="url(#colorEntrada)"
                    />
                    <Area
                      type="monotone"
                      dataKey="saida"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorSaida)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Métodos de pagamento"
              description="Saldo consolidado por método"
            >
              <div className="space-y-3">
                {paymentBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Cadastre um método de pagamento para ver o saldo.
                  </p>
                ) : (
                  paymentBreakdown.map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {pm.name}
                        </p>
                        <p className="text-xs text-slate-500">{pm.type}</p>
                      </div>
                      <p
                        className={`text-sm font-semibold ${
                          pm.total >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {formatCurrencyBRL(pm.total)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ChartCard>

            <ChartCard
              title="Campanhas de Ads"
              description="Investimento e status rápido"
              action={
                <Link
                  href="/campaigns"
                  className="text-xs font-semibold text-emerald-700"
                >
                  Ver campanhas
                </Link>
              }
            >
              <div className="space-y-3">
                {campaigns.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma campanha cadastrada ainda.
                  </p>
                ) : (
                  campaigns.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {c.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {c.platform} • {c.objective}
                          </p>
                        </div>
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
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <p>Orçado {formatCurrencyBRL(c.budget)}</p>
                        <p>Gasto {formatCurrencyBRL(c.spent)}</p>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-slate-900"
                          style={{
                            width: `${Math.min((c.spent / c.budget) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDate(c.periodStart)} → {formatDate(c.periodEnd)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Lançamentos recentes"
              description="Entradas e saídas do período"
            >
              <div className="divide-y divide-slate-200">
                {recentTransactions.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">
                    Nenhum lançamento ainda.
                  </p>
                ) : (
                  recentTransactions.map((t) => {
                    const pm = paymentMethods.find((pm) => pm.id === t.paymentMethodId);
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="flex flex-col">
                          <p className="text-sm font-semibold text-slate-800">
                            {t.note ?? "Movimentação"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(t.occurredAt)} • {pm?.name ?? "Método"}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            t.type === "entrada"
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }`}
                        >
                          {t.type === "saida" ? "-" : "+"}
                          {formatCurrencyBRL(t.amount)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </ChartCard>

            <ChartCard
              title="Distribuição de saídas por método"
              description="Pie chart com os métodos mais usados"
            >
              <div className="h-64">
                {spendByMethod.every((m) => m.value === 0) ? (
                  <p className="text-sm text-slate-500">
                    Sem dados de saídas para plotar.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendByMethod}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        {spendByMethod.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={methodColors[index % methodColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          formatCurrencyBRL(
                            typeof value === "number" ? value : Number(value ?? 0),
                          )
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard
              title="Gasto por campanha"
              description="Barras com o valor gasto em cada campanha"
              action={
                <Link
                  href="/campaigns"
                  className="text-xs font-semibold text-emerald-700"
                >
                  Ver campanhas
                </Link>
              }
            >
              <div className="h-64">
                {spendByCampaign.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma campanha cadastrada para plotar.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendByCampaign}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} />
                      <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                      <Tooltip
                        formatter={(value) =>
                          formatCurrencyBRL(
                            typeof value === "number" ? value : Number(value ?? 0),
                          )
                        }
                      />
                      <Bar dataKey="spent" fill="#0f172a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Status rápido" description="Ops e confiabilidade">
              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200">
                  <span>Disponibilidade</span>
                  <span className="text-emerald-700">99.9% alvo</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200">
                  <span>Fechamento</span>
                  <span className="font-semibold text-slate-800">Semanal</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200">
                  <span>Moeda padrão</span>
                  <span>BRL</span>
                </div>
              </div>
            </ChartCard>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
