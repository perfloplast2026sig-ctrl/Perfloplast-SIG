type PrintOptions = {
  delay?: number;
};

let activePreviewCleanup: (() => void) | undefined;

export function printWithBodyClass(className: string, options: PrintOptions = {}) {
  activePreviewCleanup?.();

  const delay = options.delay ?? 0;
  let cleaned = false;
  let toolbar: HTMLDivElement | undefined;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (delayTimer) window.clearTimeout(delayTimer);
    toolbar?.remove();
    document.body.classList.remove(className);
    window.removeEventListener("keydown", handleKeydown);
    if (activePreviewCleanup === cleanup) activePreviewCleanup = undefined;
  };

  const print = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  };

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") cleanup();
  }

  document.body.classList.add(className);
  window.addEventListener("keydown", handleKeydown);
  activePreviewCleanup = cleanup;

  const delayTimer = window.setTimeout(() => {
    if (cleaned) return;
    toolbar = buildPrintPreviewToolbar(print, cleanup);
    document.body.append(toolbar);
  }, delay);

  return cleanup;
}

function buildPrintPreviewToolbar(onPrint: () => void, onClose: () => void) {
  const toolbar = document.createElement("div");
  toolbar.className = "print-preview-actions";
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", "Acciones de vista previa PDF");

  const help = document.createElement("p");
  help.textContent = "Vista previa del PDF";

  const printButton = document.createElement("button");
  printButton.type = "button";
  printButton.textContent = "Guardar / imprimir";
  printButton.addEventListener("click", onPrint);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "print-preview-close";
  closeButton.textContent = "Cerrar";
  closeButton.addEventListener("click", onClose);

  toolbar.append(help, printButton, closeButton);
  return toolbar;
}
