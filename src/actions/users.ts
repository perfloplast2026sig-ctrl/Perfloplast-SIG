"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserManager } from "@/services/auth";
import { createUser, resolvePasswordResetRequest, setUserActive, updateUser } from "@/services/users";
import { CORPORATE_EMAIL_DOMAIN } from "@/lib/constants";
import type { Role } from "@/types";

export async function createUserAction(formData: FormData) {
  try {
    await requireUserManager();

    const emailLocal = String(formData.get("emailLocal") || "")
      .trim()
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(new RegExp(`@${CORPORATE_EMAIL_DOMAIN.replace(".", "\\.")}$`, "i"), "");
    const email = `${emailLocal}@${CORPORATE_EMAIL_DOMAIN}`;

    await createUser({
      name: String(formData.get("name") || ""),
      area: String(formData.get("area") || ""),
      email,
      roleName: String(formData.get("roleName") || "") as Role,
      password: String(formData.get("password") || ""),
    });

    revalidatePath("/usuarios");
  } catch (error) {
    redirect(`/usuarios?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo crear el usuario.")}`);
  }

  redirect("/usuarios?created=1");
}

export async function toggleUserStatusAction(formData: FormData) {
  try {
    await requireUserManager();
    const userId = String(formData.get("userId") || "");
    const nextActive = String(formData.get("nextActive") || "") === "true";

    await setUserActive(userId, nextActive);
    revalidatePath("/usuarios");
  } catch (error) {
    redirect(`/usuarios?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo actualizar el usuario.")}`);
  }

  redirect("/usuarios?updated=1");
}

export async function updateUserAction(formData: FormData) {
  const userId = String(formData.get("userId") || "");

  try {
    await requireUserManager();

    await updateUser({
      userId,
      name: String(formData.get("name") || ""),
      area: String(formData.get("area") || ""),
      email: String(formData.get("email") || ""),
      roleName: String(formData.get("roleName") || "") as Role,
      password: String(formData.get("password") || ""),
    });

    revalidatePath("/usuarios");
    revalidatePath(`/usuarios/${userId}/editar`);
  } catch (error) {
    redirect(`/usuarios/${userId}/editar?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo editar el usuario.")}`);
  }

  redirect("/usuarios?updated=1");
}

export async function resolvePasswordResetRequestAction(formData: FormData) {
  try {
    const user = await requireUserManager();
    const requestId = String(formData.get("requestId") || "");

    await resolvePasswordResetRequest(requestId, user.id);
    revalidatePath("/usuarios");
  } catch (error) {
    redirect(`/usuarios?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo cerrar la solicitud.")}`);
  }

  redirect("/usuarios?updated=1");
}
