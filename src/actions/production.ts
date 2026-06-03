"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProductionManager } from "@/services/auth";
import { createProductionEntry, updateShiftSchedules } from "@/services/production";

export async function createProductionEntryAction(formData: FormData) {
  try {
    const user = await requireProductionManager();
    await createProductionEntry({
      items: formData.getAll("productId").map((productId, index) => ({
        productId: String(productId || ""),
        warehouseId: String(formData.getAll("warehouseId")[index] || ""),
        quantity: String(formData.getAll("quantity")[index] || "0"),
      })),
      responsibleId: user.id,
    });
    revalidatePath("/produccion");
    revalidatePath("/inventario");
  } catch (error) {
    redirect(`/produccion?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo registrar la produccion.")}`);
  }

  redirect("/produccion?created=1");
}

export async function updateShiftSchedulesAction(formData: FormData) {
  try {
    await requireProductionManager();
    await updateShiftSchedules(["Manana", "Tarde", "Noche"].map((name) => ({
      name,
      startTime: String(formData.get(`${name}.startTime`) || ""),
      endTime: String(formData.get(`${name}.endTime`) || ""),
    })));
    revalidatePath("/produccion");
  } catch (error) {
    redirect(`/produccion?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo guardar la configuracion de turnos.")}`);
  }

  redirect("/produccion?updated=shifts");
}
