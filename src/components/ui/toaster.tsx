"use client";

import { useToast } from "@/components/ui/use-toast";
import { ToastContainer } from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return <ToastContainer toasts={toasts} onDismiss={dismiss} />;
}
