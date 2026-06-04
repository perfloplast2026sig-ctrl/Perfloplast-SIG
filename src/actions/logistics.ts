"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/services/auth";
import { createDispatch, resolveDispatchReturn, saveDriverLocation, updateDispatchStatus, requestDispatchReturn } from "@/services/logistics";

export async function createDispatchAction(formData: FormData) {
  try {
    await requireCurrentUser();
    await createDispatch({
      preorderId: String(formData.get("preorderId") || ""),
      driverId: String(formData.get("driverId") || ""),
      routeName: String(formData.get("routeName") || ""),
      destination: String(formData.get("destination") || ""),
    });
    revalidatePath("/logistica");
    revalidatePath("/preventas");
    revalidatePath("/facturas");
    revalidateTag("logistics", "default");
    revalidateTag("preorders", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
  } catch (error) {
    redirect(`/logistica?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo crear el despacho.")}`);
  }

  redirect("/logistica?created=1");
}

export async function saveDriverLocationAction(input: { latitude: number; longitude: number; accuracy?: number }) {
  const user = await requireCurrentUser();
  if (!["Piloto", "Vendedor"].includes(user.role.name)) return { ok: false };

  await saveDriverLocation({ userId: user.id, latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy });
  return;
}

export async function updateDispatchStatusAction(formData: FormData) {
  try {
    const user = await requireCurrentUser();
    await updateDispatchStatus({
      dispatchId: String(formData.get("dispatchId") || ""),
      status: String(formData.get("status") || ""),
      userId: user.id,
      roleName: user.role.name,
    });
    revalidatePath("/logistica");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/preventas");
    revalidatePath("/inventario");
    revalidatePath("/facturas");
    revalidateTag("logistics", "default");
    revalidateTag("preorders", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
  } catch (error) {
    redirect(`/logistica?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo actualizar el despacho.")}`);
  }

  return;
}

export async function requestDispatchReturnAction(formData: FormData) {
  try {
    const user = await requireCurrentUser();
    await requestDispatchReturn({
      dispatchId: String(formData.get("dispatchId") || ""),
      reason: String(formData.get("reason") || ""),
      driverId: user.id,
    });
    revalidatePath("/logistica");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidateTag("logistics", "default");
    revalidateTag("preorders", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
  } catch (error) {
    redirect(`/logistica?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo registrar la devolucion.")}`);
  }

  return;
}

export async function resolveDispatchReturnAction(formData: FormData) {
  try {
    await requireCurrentUser();
    await resolveDispatchReturn({
      dispatchId: String(formData.get("dispatchId") || ""),
      resolution: String(formData.get("resolution") || ""),
    });
    revalidatePath("/logistica");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidateTag("logistics", "default");
    revalidateTag("preorders", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
  } catch (error) {
    redirect(`/logistica?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo resolver la devolucion.")}`);
  }

  return;
}
