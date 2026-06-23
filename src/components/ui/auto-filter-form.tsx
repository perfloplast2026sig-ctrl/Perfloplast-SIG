"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

export function AutoFilterForm({ children, className }: { children: ReactNode; className: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  function submit(delay = 0) {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      formRef.current?.requestSubmit();
    }, delay);
  }

  return (
    <form
      ref={formRef}
      className={className}
      method="get"
      onChange={(event) => {
        if (event.target instanceof HTMLInputElement && event.target.type === "text") return;
        submit();
      }}
      onInput={(event) => {
        if (event.target instanceof HTMLInputElement && event.target.type === "text") submit(350);
      }}
    >
      {children}
    </form>
  );
}
