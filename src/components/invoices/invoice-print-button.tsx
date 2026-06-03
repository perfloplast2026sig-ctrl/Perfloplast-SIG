"use client";

import { Printer } from "lucide-react";

export function InvoicePrintButton() {
  return (
    <button className="inline-flex h-9 items-center gap-2 rounded-full border bg-card px-3 text-xs font-medium transition hover:bg-card-muted" onClick={() => window.print()} type="button">
      <Printer size={14} />Imprimir
    </button>
  );
}
