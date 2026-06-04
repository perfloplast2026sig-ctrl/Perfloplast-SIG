"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/services/auth";
import { createPreorder } from "@/services/preorders";

export async function createPreorderAction(formData: FormData) {
  const mode = String(formData.get("mode") || "preorder");
  let redirectTo = "/preventas?created=1";
  try {
    const user = await requireCurrentUser();
    const preorder = await createPreorder({
      clientName: String(formData.get("clientName") || ""),
      taxId: String(formData.get("taxId") || ""),
      phone: String(formData.get("phone") || ""),
      address: String(formData.get("address") || ""),
      deliveryAddress: String(formData.get("deliveryAddress") || ""),
      originLocationId: String(formData.get("originLocationId") || ""),
      paymentMethod: String(formData.get("paymentMethod") || ""),
      saleLatitude: String(formData.get("saleLatitude") || ""),
      saleLongitude: String(formData.get("saleLongitude") || ""),
      saleAccuracy: String(formData.get("saleAccuracy") || ""),
      discount: String(formData.get("discount") || "0"),
      amountReceived: String(formData.get("amountReceived") || "0"),
      mode,
      items: formData.getAll("productId").map((productId, index) => ({
        productId: String(productId || ""),
        quantity: String(formData.getAll("quantity")[index] || "0"),
        unitPrice: String(formData.getAll("unitPrice")[index] || "0"),
      })),
      createdById: user.id,
    });
    revalidatePath("/preventas");
    revalidatePath("/inventario");
    revalidateTag("dashboard", "default");
    if (mode === "quote") {
      redirectTo = `/preventas?created=quote&quote=${preorder.id}`;
    }
  } catch (error) {
    redirect(`/preventas?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo crear la preventa.")}`);
  }

  redirect(redirectTo);
}
