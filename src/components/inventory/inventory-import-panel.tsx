"use client";

import { CheckCircle2, FileSpreadsheet, UploadCloud } from "lucide-react";
import { useState } from "react";

export function InventoryImportPanel({ canManage }: { canManage: boolean }) {
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError("");
    setFileName("");
    if (!file) return;

    const valid = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!valid) {
      setFileError("Usa un archivo Excel .xlsx, .xls o .csv.");
      event.target.value = "";
      return;
    }

    setFileName(file.name);
  }

  if (!canManage) return null;

  return (
    <section className="mt-6 rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl border bg-card-muted text-accent">
              <FileSpreadsheet size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Carga inicial</p>
              <h2 className="text-lg font-black tracking-tight">Importar Excel</h2>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Selecciona el archivo cuando tengas el modelo. Luego se habilitara una vista previa para comparar duplicados,
            cambios y registros nuevos antes de guardar.
          </p>
        </div>

        <div className="w-full shrink-0 lg:w-[460px]">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed bg-background px-4 py-3 transition hover:border-accent hover:bg-card">
            <input accept=".xlsx,.xls,.csv" className="sr-only" onChange={handleFileChange} type="file" />
            <div className="min-w-0">
              <span className="block text-sm font-black">Seleccionar archivo Excel</span>
              <span className="block text-xs leading-5 text-muted">.xlsx, .xls o .csv</span>
            </div>
            <UploadCloud className="shrink-0 text-accent" size={24} />
          </label>

          {fileName ? (
            <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 shrink-0" size={16} />
                <p className="break-words"><span className="font-bold">Archivo listo para revisar:</span> {fileName}</p>
              </div>
            </div>
          ) : null}

          {fileError ? <p className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200">{fileError}</p> : null}

          <button className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-muted px-4 text-sm font-black text-muted-foreground" disabled type="button">
            Vista previa pendiente
          </button>
        </div>
      </div>
    </section>
  );
}
