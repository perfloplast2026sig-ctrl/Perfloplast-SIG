"use client";

import { loginAction, requestPasswordResetAction } from "@/actions/auth";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, X } from "lucide-react";
import Image from "next/image";
import { use, useState } from "react";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const params = use(searchParams);
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 sm:p-8">
      <Image alt="Productos Perfloplast" className="object-cover" fill priority sizes="100vw" src="/bg-login.png" />
      <div className="absolute inset-0 bg-slate-950/35 mix-blend-multiply" />

      <section className="relative z-10 w-full max-w-[480px] rounded-[2rem] border border-white/10 bg-slate-900/60 p-8 shadow-[0_0_50px_rgba(0,120,255,0.1)] backdrop-blur-2xl sm:p-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mx-auto mb-2 h-[148px] w-full max-w-[320px] pointer-events-none">
            <Image
              alt="Logo de Perfloplast"
              className="object-contain brightness-125 drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]"
              fill
              priority
              sizes="320px"
              src="/company-logo.svg.png"
            />
          </div>
          <h1 className="relative z-10 text-[32px] font-bold tracking-tight text-white drop-shadow-sm">Bienvenido</h1>
          <p className="mt-2 text-[15px] font-medium text-gray-300">Inicia sesion para continuar</p>
        </div>

        {params.error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-medium text-red-200 backdrop-blur-md">
            {params.error}
          </div>
        ) : null}
        {params.reset ? (
          <div className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-center text-sm font-medium text-cyan-100 backdrop-blur-md">
            Solicitud enviada. Un administrador revisara tu acceso y podra asignarte una clave temporal.
          </div>
        ) : null}

        <form action={loginAction} className="space-y-6">
          <div>
            <label className="mb-2 block text-[13px] font-bold text-gray-300">Correo electronico</label>
            <div className="flex h-[56px] items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-5 shadow-inner transition-all focus-within:border-cyan-400 focus-within:bg-slate-950/80 focus-within:ring-4 focus-within:ring-cyan-400/10">
              <Mail className="text-gray-400" size={20} />
              <input className="w-full bg-transparent text-[16px] font-medium text-white outline-none placeholder:text-gray-500" name="email" placeholder="admin@perfloplast.com" required type="email" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-bold text-gray-300">Contrasena</label>
            <div className="flex h-[56px] items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-5 shadow-inner transition-all focus-within:border-cyan-400 focus-within:bg-slate-950/80 focus-within:ring-4 focus-within:ring-cyan-400/10">
              <LockKeyhole className="text-gray-400" size={20} />
              <input className="w-full bg-transparent text-[16px] font-medium text-white outline-none placeholder:text-gray-500" name="password" placeholder="************" required type={showPassword ? "text" : "password"} />
              <button className="text-gray-400 transition-colors hover:text-white focus:outline-none" onClick={() => setShowPassword(!showPassword)} type="button">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[14px]">
            <label className="group flex cursor-pointer items-center gap-2 font-semibold text-gray-300">
              <input className="size-4 cursor-pointer rounded border-white/20 bg-black/20 text-cyan-500 transition-all focus:ring-cyan-500/50" type="checkbox" />
              <span className="transition-colors group-hover:text-white">Recordarme</span>
            </label>
            <button className="font-semibold text-cyan-400 drop-shadow-sm transition-colors hover:text-cyan-300" onClick={() => setShowReset(true)} type="button">
              Olvidaste tu contrasena?
            </button>
          </div>

          <button className="mt-8 flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl border border-blue-400/20 bg-gradient-to-r from-[#004e92] to-[#000428] px-4 text-[16px] font-bold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,116,183,0.4)] active:scale-[0.98]" type="submit">
            Ingresar al sistema
            <ArrowRight size={20} />
          </button>
        </form>
      </section>

      {showReset ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl backdrop-blur-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-200/80">Recuperacion de acceso</p>
                <h2 className="mt-1 text-2xl font-bold">Solicitar clave temporal</h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">Se notificara a un Super Admin o Administrador para que revise la solicitud y restablezca tu clave desde Usuarios.</p>
              </div>
              <button className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:text-white" onClick={() => setShowReset(false)} type="button">
                <X size={17} />
              </button>
            </div>

            <form action={requestPasswordResetAction} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-300">Correo corporativo</span>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 focus-within:border-cyan-400">
                  <Mail className="text-gray-400" size={18} />
                  <input className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-gray-500" name="resetEmail" placeholder="usuario@perfloplast.com" required type="email" />
                </div>
              </label>
              <button className="flex h-11 w-full items-center justify-center rounded-2xl bg-cyan-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-400" type="submit">
                Enviar solicitud
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
