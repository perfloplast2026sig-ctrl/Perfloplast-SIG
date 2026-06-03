"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireInventoryManager } from "@/services/auth";
import { adjustFinishedStock, createFinishedProduct, createWarehouse, deactivateFinishedProduct, setFactoryWarehouse, updateFinishedProduct } from "@/services/inventory";

export async function createWarehouseAction(formData: FormData) {
  try {
    await requireInventoryManager();
    await createWarehouse({
      code: String(formData.get("code") || ""),
      name: String(formData.get("name") || ""),
      isFactoryWarehouse: String(formData.get("isFactoryWarehouse") || "") === "on",
    });
    revalidatePath("/inventario");
  } catch (error) {
    redirect(`/inventario?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo crear la bodega.")}`);
  }

  redirect("/inventario?created=warehouse");
}

export async function setFactoryWarehouseAction(formData: FormData) {
  try {
    await requireInventoryManager();
    await setFactoryWarehouse(String(formData.get("warehouseId") || ""));
    revalidatePath("/inventario");
  } catch (error) {
    redirect(`/inventario?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo asignar bodega de fabrica.")}`);
  }

  redirect("/inventario?updated=factory");
}

export async function adjustFinishedStockAction(formData: FormData) {
  try {
    const user = await requireInventoryManager();
    await adjustFinishedStock({
      productId: String(formData.get("productId") || ""),
      warehouseId: String(formData.get("warehouseId") || ""),
      physicalQuantity: String(formData.get("physicalQuantity") || "0"),
      reason: String(formData.get("reason") || ""),
      createdById: user.id,
    });
    revalidatePath("/inventario");
    revalidatePath("/reportes");
  } catch (error) {
    redirect(`/inventario?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo ajustar el stock.")}`);
  }

  redirect("/inventario?updated=stock");
}

export async function createFinishedProductAction(formData: FormData) {
  try {
    const user = await requireInventoryManager();
    await createFinishedProduct({
      sku: String(formData.get("sku") || ""),
      name: String(formData.get("name") || ""),
      modelName: String(formData.get("modelName") || ""),
      color: String(formData.get("color") || ""),
      description: String(formData.get("description") || ""),
      priceGTQ: String(formData.get("priceGTQ") || ""),
      unit: String(formData.get("unit") || "unidad"),
      minimumStock: String(formData.get("minimumStock") || "0"),
      warehouseId: String(formData.get("warehouseId") || ""),
      initialQuantity: String(formData.get("initialQuantity") || "0"),
      createdById: user.id,
    });
    revalidatePath("/inventario");
    revalidatePath("/produccion");
  } catch (error) {
    redirect(`/inventario?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo crear el producto terminado.")}`);
  }

  redirect("/inventario?created=product");
}

export async function updateFinishedProductAction(formData: FormData) {
  try {
    await requireInventoryManager();
    await updateFinishedProduct({
      productId: String(formData.get("productId") || ""),
      sku: String(formData.get("sku") || ""),
      name: String(formData.get("name") || ""),
      modelName: String(formData.get("modelName") || ""),
      color: String(formData.get("color") || ""),
      description: String(formData.get("description") || ""),
      priceGTQ: String(formData.get("priceGTQ") || ""),
      unit: String(formData.get("unit") || "unidad"),
      minimumStock: String(formData.get("minimumStock") || "0"),
    });
    revalidatePath("/inventario");
    revalidatePath("/produccion");
  } catch (error) {
    redirect(`/inventario?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo actualizar el producto terminado.")}`);
  }

  redirect("/inventario?updated=product");
}

export async function deactivateFinishedProductAction(formData: FormData) {
  try {
    await requireInventoryManager();
    await deactivateFinishedProduct(String(formData.get("productId") || ""));
    revalidatePath("/inventario");
    revalidatePath("/produccion");
  } catch (error) {
    redirect(`/inventario?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo desactivar el producto terminado.")}`);
  }

  redirect("/inventario?updated=product");
}
