"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSessionUserId } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { CORPORATE_EMAIL_DOMAIN, isCorporateEmail } from "@/lib/constants";
import { assertLoginAllowed, clearFailedLogins, registerFailedLogin } from "@/lib/login-attempts";
import { createPasswordResetRequest, findRecentPendingPasswordResetRequest } from "@/services/password-reset-requests";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!isCorporateEmail(email)) {
    redirect(`/login?error=${encodeURIComponent(`Usa un correo @${CORPORATE_EMAIL_DOMAIN}.`)}`);
  }

  try {
    assertLoginAllowed(email);
  } catch (error) {
    redirect(`/login?error=${encodeURIComponent(error instanceof Error ? error.message : "Demasiados intentos.")}`);
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    registerFailedLogin(email);
    redirect("/login?error=Credenciales%20invalidas%20o%20cuenta%20inactiva.");
  }

  clearFailedLogins(email);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.auditLog.create({ data: { userId: user.id, action: "AUTH_LOGIN", entity: "User", entityId: user.id } }),
  ]);
  await createSession(user.id);
  revalidateTag("logistics", "default");
  redirect("/");
}

export async function logoutAction() {
  const userId = await getSessionUserId();
  if (userId) {
    await prisma.auditLog.create({ data: { userId, action: "AUTH_LOGOUT", entity: "User", entityId: userId } });
    revalidatePath("/logistica");
    revalidateTag("logistics", "default");
  }
  await destroySession();
  redirect("/login");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("resetEmail") || "").trim().toLowerCase();

  if (!isCorporateEmail(email)) {
    redirect(`/login?error=${encodeURIComponent(`Usa un correo @${CORPORATE_EMAIL_DOMAIN}.`)}`);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const recentRequest = await findRecentPendingPasswordResetRequest(email, new Date(Date.now() - 15 * 60 * 1000));

  if (!recentRequest) {
    await createPasswordResetRequest({ requesterEmail: email, userId: user?.id || null });
  }

  redirect("/login?reset=1");
}
