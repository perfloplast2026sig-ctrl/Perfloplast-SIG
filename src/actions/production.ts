"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireProductionManager, requireShiftScheduleManager } from "@/services/auth";
import { createProductionEntry, updateShiftSchedules } from "@/services/production";

export async function createProductionEntryAction(formData: FormData) {
  try {
    const user = await requireProductionManager();
    await createProductionEntry({
      items: formData.getAll("productId").map((productId, index) => ({
        productId: String(productId || ""),
        warehouseId: String(formData.getAll("warehouseId")[index] || ""),
        quantity: String(formData.getAll("quantity")[index] || "0"),
        rejectedQuantity: String(formData.getAll("rejectedQuantity")[index] || "0"),
      })),
      responsibleId: user.id,
    });
    revalidatePath("/produccion");
    revalidatePath("/inventario");
    revalidatePath("/reportes");
    revalidateTag("production", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
    revalidateTag("header", "default");
  } catch (error) {
    redirect(`/produccion?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo registrar la produccion.")}`);
  }

  redirect("/produccion?created=1");
}

export async function updateShiftSchedulesAction(formData: FormData) {
  try {
    await requireShiftScheduleManager();
    await updateShiftSchedules(["Manana", "Tarde", "Noche"].map((name) => ({
      name,
      startTime: String(formData.get(`${name}.startTime`) || ""),
      endTime: String(formData.get(`${name}.endTime`) || ""),
    })));
    revalidatePath("/produccion");
    revalidateTag("production", "default");
    revalidateTag("inventory", "default");
    revalidateTag("dashboard", "default");
    revalidateTag("header", "default");
  } catch (error) {
    redirect(`/produccion?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo guardar la configuracion de turnos.")}`);
  }

  redirect("/produccion?updated=shifts");
}
