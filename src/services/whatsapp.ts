export async function sendWhatsappDocument({
  caption,
  filename,
  pdfBuffer,
  phone,
}: {
  caption: string;
  filename: string;
  pdfBuffer: Buffer;
  phone: string;
}) {
  const version = process.env.WHATSAPP_API_VERSION || "v23.0";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const to = normalizePhone(phone);

  if (!phoneNumberId || !token) {
    throw new Error("WhatsApp Business API no esta configurado. Revisa WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN.");
  }

  if (!to) {
    throw new Error("El cliente no tiene telefono registrado para WhatsApp.");
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), filename);

  const uploadResponse = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  const upload = await uploadResponse.json();

  if (!uploadResponse.ok || !upload.id) {
    throw new Error(upload.error?.message || "No se pudo subir el PDF a WhatsApp.");
  }

  const sendResponse = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "document",
      document: {
        id: upload.id,
        filename,
        caption,
      },
    }),
  });
  const sent = await sendResponse.json();

  if (!sendResponse.ok) {
    throw new Error(sent.error?.message || "No se pudo enviar el PDF por WhatsApp.");
  }

  return sent;
}

function normalizePhone(phone: string) {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 8) return `502${clean}`;
  if (clean.length === 11 && clean.startsWith("502")) return clean;
  return "";
}
