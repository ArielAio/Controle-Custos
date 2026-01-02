import { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  caption,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: "default" | "positive" | "negative";
  icon?: ReactNode;
}) {
  const tones: Record<"default" | "positive" | "negative", string> = {
    default: "bg-white border-slate-200",
    positive: "bg-emerald-50 border-emerald-100",
    negative: "bg-rose-50 border-rose-100",
  };

  const textTone: Record<"default" | "positive" | "negative", string> = {
    default: "text-slate-900",
    positive: "text-emerald-800",
    negative: "text-rose-800",
  };

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-4 shadow-sm ${tones[tone]}`}
    >
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon && <span className="text-base text-slate-400">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${textTone[tone]}`}>{value}</div>
      {caption ? (
        <div className="text-xs text-slate-500">{caption}</div>
      ) : null}
    </div>
  );
}
