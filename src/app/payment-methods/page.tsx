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
import { addPaymentMethod, deletePaymentMethod, listPaymentMethods, listTransactions, updatePaymentMethod } from "@/lib/firestore";
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
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  useEffect(() => {
    if (editing) {
      methodForm.reset({
        name: editing.name,
        type: editing.type,
        active: editing.active,
      });
    }
  }, [editing, methodForm]);

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
    
    if (editing) {
      await updatePaymentMethod(editing.id, payload);
    } else {
      await addPaymentMethod(user.uid, payload);
    }
    
    const [pm, tx] = await Promise.all([
      listPaymentMethods(user.uid),
      listTransactions(user.uid),
    ]);
    setPaymentMethods(pm);
    setTransactions(tx);
    methodForm.reset({ name: "", type: "cartao", active: true });
    setEditing(null);
    setSaving(false);
  });

  const handleEdit = (pm: PaymentMethod) => {
    setEditing(pm);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditing(null);
    methodForm.reset({ name: "", type: "cartao", active: true });
  };

  const handleDelete = async (pmId: string) => {
    if (!user) return;
    if (!confirm("Tem certeza que deseja excluir este método de pagamento?")) return;
    setDeleting(pmId);
    await deletePaymentMethod(pmId);
    const [pm, tx] = await Promise.all([
      listPaymentMethods(user.uid),
      listTransactions(user.uid),
    ]);
    setPaymentMethods(pm);
    setTransactions(tx);
    setDeleting(null);
  };

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
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEdit(pm)}
                        className="flex-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDelete(pm.id)}
                        disabled={deleting === pm.id}
                        className="flex-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        {deleting === pm.id ? "..." : "🗑️ Excluir"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-800">
                {editing ? "Editar método de pagamento" : "Novo método de pagamento"}
              </p>
              <p className="text-xs text-slate-500">
                {editing
                  ? "Atualize os dados do método de pagamento."
                  : "Grava direto na coleção paymentMethods com o seu UID."}
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
              <div className="flex items-end md:col-span-1 gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : editing ? "Atualizar" : "Adicionar"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
