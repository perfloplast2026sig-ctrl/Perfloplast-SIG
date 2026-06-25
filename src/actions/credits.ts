"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireCreditManager } from "@/services/auth";
import { createCreditPayment, createCustomerCredit } from "@/services/credits";

export async function createCustomerCreditAction(formData: FormData) {
  try {
    const user = await requireCreditManager();
    await createCustomerCredit({
      invoiceId: String(formData.get("invoiceId") || ""),
      clientName: String(formData.get("clientName") || ""),
      taxId: String(formData.get("taxId") || ""),
      phone: String(formData.get("phone") || ""),
      address: String(formData.get("address") || ""),
      sellerName: String(formData.get("sellerName") || ""),
      preorderCode: String(formData.get("preorderCode") || ""),
      invoiceNumber: String(formData.get("invoiceNumber") || ""),
      creditAmount: String(formData.get("creditAmount") || "0"),
      openingBalance: String(formData.get("openingBalance") || ""),
      notes: String(formData.get("notes") || ""),
      createdById: user.id,
    });
    revalidatePath("/creditos");
    revalidateTag("credits", "default");
  } catch (error) {
    redirect(`/creditos?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo crear el credito.")}`);
  }

  redirect("/creditos?created=credit");
}

export async function createCreditPaymentAction(formData: FormData) {
  try {
    const user = await requireCreditManager();
    await createCreditPayment({
      creditId: String(formData.get("creditId") || ""),
      paymentDate: String(formData.get("paymentDate") || ""),
      bank: String(formData.get("bank") || ""),
      documentNumber: String(formData.get("documentNumber") || ""),
      amount: String(formData.get("amount") || "0"),
      notes: String(formData.get("notes") || ""),
      createdById: user.id,
    });
    revalidatePath("/creditos");
    revalidateTag("credits", "default");
  } catch (error) {
    redirect(`/creditos?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo registrar el abono.")}`);
  }

  redirect("/creditos?created=payment");
}