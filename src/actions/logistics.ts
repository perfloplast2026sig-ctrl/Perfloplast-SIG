"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser, requireSuperAdmin } from "@/services/auth";
import { cancelDispatch, createDispatches, resolveDispatchReturn, saveDriverLocation, updateDispatchStatus, requestDispatchReturn, verifyDispatchLoad } from "@/services/logistics";

export async function createDispatchAction(formData: FormData) {
  let createdDispatches = 0;
  try {
    const user = await requireCurrentUser();
    const rejectedIds = formData.getAll("rejectedPreorderItemId").map(String);
    const loadedItemIds = formData.getAll("loadedPreorderItemId").map(String);
    const transferItemIds = formData.getAll("transferPreorderItemId").map(String);
    const dispatches = await createDispatches({
      preorderIds: formData.getAll("preorderId").map(String),
      driverId: String(formData.get("driverId") || ""),
      routeName: String(formData.get("routeName") || ""),
      destination: String(formData.get("destination") || ""),
      approvedById: user.id,
      approvedByRole: user.role.name,
      rejectedItems: rejectedIds.map((preorderItemId) => ({
        preorderItemId,
        reason: "Producto rechazado en revision de carga",
      })),
      loadedItems: loadedItemIds.map((preorderItemId) => ({
        preorderItemId,
        quantity: String(formData.get(`loadedQuantity-${preorderItemId}`) || ""),
      })),
      transferItems: transferItemIds.map((preorderItemId) => ({
        preorderItemId,
        sourceLocationId: String(formData.get(`sourceLocationId-${preorderItemId}`) || ""),
      })),
    });
    createdDispatches = dispatches.length;
    revalidatePath("/logistica");
    revalidatePath("/preventas");
    revalidatePath("/facturas");
    revalidatePath("/reportes");
    revalidateTag("logistics", "default");
    revalidateTag("preorders", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
    revalidateTag("header", "default");
  } catch (error) {
    redirect(`/logistica?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo crear el despacho.")}`);
  }

  redirect(createdDispatches > 0 ? "/logistica?created=1" : "/logistica?rejected=1");
}

export async function verifyDispatchLoadAction(formData: FormData) {
  try {
    const user = await requireCurrentUser();
    const rejectedIds = formData.getAll("rejectedItemId").map(String);
    await verifyDispatchLoad({
      dispatchId: String(formData.get("dispatchId") || ""),
      userId: user.id,
      roleName: user.role.name,
      rejectedItems: rejectedIds.map((dispatchItemId) => ({
        dispatchItemId,
        reason: "Producto rechazado en revision de carga",
      })),
    });
    revalidatePath("/logistica");
    revalidatePath("/logistica/devoluciones");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/preventas");
    revalidatePath("/inventario");
    revalidatePath("/facturas");
    revalidatePath("/reportes");
    revalidateTag("logistics", "default");
    revalidateTag("preorders", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
    revalidateTag("header", "default");
  } catch (error) {
    redirect(`/logistica?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo verificar la carga.")}`);
  }

  return;
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
    revalidatePath("/logistica/devoluciones");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/preventas");
    revalidatePath("/inventario");
    revalidatePath("/facturas");
    revalidatePath("/reportes");
    revalidateTag("logistics", "default");
    revalidateTag("preorders", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
    revalidateTag("header", "default");
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
      items: formData.getAll("dispatchItemId").map((dispatchItemId, index) => ({
        dispatchItemId: String(dispatchItemId || ""),
        quantity: String(formData.getAll("returnQuantity")[index] || "0"),
      })),
    });
    revalidatePath("/logistica");
    revalidatePath("/logistica/devoluciones");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidateTag("logistics", "default");
    revalidateTag("preorders", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
    revalidateTag("header", "default");
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
    revalidatePath("/logistica/devoluciones");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidateTag("logistics", "default");
    revalidateTag("preorders", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
    revalidateTag("header", "default");
  } catch (error) {
    redirect(`/logistica?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo resolver la devolucion.")}`);
  }

  return;
}

export async function cancelDispatchAction(formData: FormData) {
  try {
    const user = await requireSuperAdmin();
    await cancelDispatch({
      dispatchId: String(formData.get("dispatchId") || ""),
      reason: String(formData.get("reason") || ""),
      userId: user.id,
    });
    revalidatePath("/logistica");
    revalidatePath("/logistica/devoluciones");
    revalidatePath("/preventas");
    revalidatePath("/inventario");
    revalidatePath("/facturas");
    revalidatePath("/reportes");
    revalidatePath("/dashboard");
    revalidateTag("logistics", "default");
    revalidateTag("preorders", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
    revalidateTag("header", "default");
  } catch (error) {
    redirect(`/logistica?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo anular el despacho.")}`);
  }

  redirect("/logistica?cancelled=1");
}
