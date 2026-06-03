import { NextResponse } from "next/server";

export function proxy() {
  // Placeholder: aqui se validaran sesion, rol y permisos antes de entrar a cada modulo.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
