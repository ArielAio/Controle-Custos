export type TransactionType = "entrada" | "saida";

export interface PaymentMethod {
  id: string;
  name: string;
  type: "cartao" | "pix" | "boleto" | "outro";
  active: boolean;
  ownerId?: string;
}

export interface Campaign {
  id: string;
  name: string;
  platform: string;
  objective: string;
  budget: number;
  spent: number;
  periodStart: string;
  periodEnd: string;
  status: "ativa" | "pausada" | "encerrada";
  ownerId?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  paymentMethodId: string;
  note?: string;
  campaignId?: string;
  occurredAt: string;
  ownerId?: string;
  createdAt: string;
}

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  paymentMethodId?: string;
  type?: TransactionType;
  campaignId?: string;
}

export interface TimelinePoint {
  label: string;
  entrada: number;
  saida: number;
}
