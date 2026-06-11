type PrintOptions = {
  delay?: number;
};

export function printWithBodyClass(className: string, options: PrintOptions = {}) {
  const delay = options.delay ?? 80;
  let cleaned = false;
  let fallbackTimer: number | undefined;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    window.clearTimeout(printTimer);
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    document.body.classList.remove(className);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  document.body.classList.add(className);

  const printTimer = window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cleaned) return;
        window.print();
        fallbackTimer = window.setTimeout(cleanup, 120000);
      });
    });
  }, delay);

  return cleanup;
}
