"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-context";

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
