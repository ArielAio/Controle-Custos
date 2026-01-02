import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import app from "./firebase";
import { Campaign, PaymentMethod, Transaction } from "./types";

const db = getFirestore(app);

function mapTimestampToDate(value: Timestamp | string | Date): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

export async function listPaymentMethods(ownerId: string) {
  const ref = collection(db, "paymentMethods");
  const snap = await getDocs(query(ref, where("ownerId", "==", ownerId)));
  return snap.docs.map(
    (doc) =>
      ({
        id: doc.id,
        name: doc.data().name,
        type: doc.data().type,
        active: doc.data().active,
        ownerId,
      }) as PaymentMethod,
  );
}

export async function listCampaigns(ownerId: string) {
  const ref = collection(db, "campaigns");
  const snap = await getDocs(query(ref, where("ownerId", "==", ownerId)));
  return snap.docs.map(
    (doc) =>
      ({
        id: doc.id,
        name: doc.data().name,
        platform: doc.data().platform,
        objective: doc.data().objective,
        budget: doc.data().budget,
        spent: doc.data().spent,
        periodStart: mapTimestampToDate(doc.data().periodStart),
        periodEnd: mapTimestampToDate(doc.data().periodEnd),
        status: doc.data().status,
        ownerId,
      }) as Campaign,
  );
}

export async function listTransactions(ownerId: string) {
  const ref = collection(db, "transactions");
  const snap = await getDocs(
    query(ref, where("ownerId", "==", ownerId), orderBy("occurredAt", "desc")),
  );
  return snap.docs.map(
    (doc) =>
      ({
        id: doc.id,
        type: doc.data().type,
        amount: doc.data().amount,
        currency: doc.data().currency ?? "BRL",
        paymentMethodId: doc.data().paymentMethodId,
        campaignId: doc.data().campaignId,
        note: doc.data().note,
        occurredAt: mapTimestampToDate(doc.data().occurredAt),
        createdAt: mapTimestampToDate(doc.data().createdAt ?? new Date()),
        ownerId,
      }) as Transaction,
  );
}

export async function addTransaction(
  ownerId: string,
  data: Omit<Transaction, "id" | "ownerId" | "createdAt" | "currency"> & {
    currency?: string;
  },
) {
  const ref = collection(db, "transactions");
  const payload = {
    ...data,
    currency: data.currency ?? "BRL",
    ownerId,
    createdAt: serverTimestamp(),
    occurredAt: data.occurredAt,
  };
  await addDoc(ref, payload);
}

export async function addPaymentMethod(ownerId: string, data: Omit<PaymentMethod, "id" | "ownerId">) {
  const ref = collection(db, "paymentMethods");
  await addDoc(ref, {
    ...data,
    ownerId,
  });
}

export async function addCampaign(ownerId: string, data: Omit<Campaign, "id" | "ownerId">) {
  const ref = collection(db, "campaigns");
  await addDoc(ref, {
    ...data,
    ownerId,
  });
}
