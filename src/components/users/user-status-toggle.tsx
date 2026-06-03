"use client";

import { useRef } from "react";
import { toggleUserStatusAction } from "@/actions/users";

export function UserStatusToggle({ userId, isActive, isProtected }: { userId: string; isActive: boolean; isProtected: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={toggleUserStatusAction} ref={formRef}>
      <input name="userId" type="hidden" value={userId} />
      <input name="nextActive" type="hidden" value={String(!isActive)} />
      <button
        aria-label={isActive ? "Desactivar usuario" : "Activar usuario"}
        className={`group relative inline-flex h-8 w-14 items-center overflow-hidden rounded-full border shadow-sm transition duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-45 ${isActive ? "border-emerald-400/50 bg-emerald-500/85 shadow-emerald-900/15" : "border-rose-400/50 bg-rose-500/85 shadow-rose-900/15"}`}
        disabled={isProtected}
        onClick={() => formRef.current?.requestSubmit()}
        type="button"
      >
        <span className={`absolute inset-y-1 rounded-full bg-white/20 transition-all duration-300 ${isActive ? "left-7 right-1" : "left-1 right-7"}`} />
        <span className={`relative inline-grid size-6 place-items-center rounded-full bg-white text-[10px] font-black shadow-lg transition duration-300 group-hover:shadow-xl ${isActive ? "translate-x-7 text-emerald-700" : "translate-x-1 text-rose-700"}`}>
          {isActive ? "ON" : "OFF"}
        </span>
      </button>
    </form>
  );
}
