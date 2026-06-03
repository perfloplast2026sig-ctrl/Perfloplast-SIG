"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/services/auth";
import { buildQuotePdfBuffer, getQuotePdfData } from "@/services/quote-pdf";
import { sendWhatsappDocument } from "@/services/whatsapp";

export async function sendQuoteWhatsappAction(formData: FormData) {
  const preorderId = String(formData.get("preorderId") || "");
  if (!preorderId) redirect("/preventas?error=Cotizacion%20no%20valida.");

  try {
    const user = await requireCurrentUser();
    const canSeeAll = ["Super admin", "Administrador"].includes(user.role.name);
    const quote = await getQuotePdfData(preorderId, user.id, canSeeAll);
    const pdfBuffer = buildQuotePdfBuffer(quote);

    await sendWhatsappDocument({
      phone: quote.phone,
      filename: `${quote.code}.pdf`,
      pdfBuffer,
      caption: `Cotizacion ${quote.code} para ${quote.client}. Total ${quote.total}. Documento informativo, no descuenta stock hasta confirmar la venta.`,
    });

    revalidatePath("/preventas");
  } catch (error) {
    redirect(`/preventas?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo enviar la cotizacion por WhatsApp.")}`);
  }

  redirect("/preventas?sent=whatsapp");
}
