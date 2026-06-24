"use client";

import { AlertTriangle, CheckCircle2, FileSpreadsheet, UploadCloud } from "lucide-react";
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
    <section className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Carga inicial</p>
              <h2 className="mt-1 text-xl font-black tracking-tight">Importar datos desde Excel</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Este apartado queda preparado para alimentar inventario, productos, bodegas, clientes y ventas sin empezar de cero.
                La importacion final se activara cuando definamos las columnas del archivo.
              </p>
            </div>
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl border bg-card-muted text-accent shadow-sm">
              <FileSpreadsheet size={22} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { title: "1. Leer archivo", detail: "Validar hojas y columnas antes de tocar datos." },
              { title: "2. Comparar", detail: "Detectar repetidos por codigo, producto, cliente o documento." },
              { title: "3. Sincronizar", detail: "Agregar faltantes y actualizar solo datos que cambiaron." },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border bg-card-muted/30 p-3">
                <p className="text-sm font-black">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{step.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <p>
                Por seguridad, esta primera version todavia no escribe en la base de datos. Primero se definira el formato del Excel
                y luego se habilitara una vista previa con errores, duplicados, cambios y nuevos registros.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t bg-card-muted/20 p-4 sm:p-5 lg:border-l lg:border-t-0">
          <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed bg-background p-5 text-center transition hover:border-accent hover:bg-card">
            <input accept=".xlsx,.xls,.csv" className="sr-only" onChange={handleFileChange} type="file" />
            <UploadCloud className="text-accent" size={32} />
            <span className="mt-3 text-sm font-black">Seleccionar archivo Excel</span>
            <span className="mt-1 text-xs leading-5 text-muted">Formatos permitidos: .xlsx, .xls o .csv</span>
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

          <button className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-muted px-4 text-sm font-black text-muted-foreground" disabled type="button">
            Vista previa pendiente
          </button>
          <p className="mt-2 text-xs leading-5 text-muted">
            Cuando el formato este definido, este boton mostrara la revision antes de importar.
          </p>
        </div>
      </div>
    </section>
  );
}
