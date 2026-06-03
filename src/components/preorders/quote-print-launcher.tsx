"use client";

import Image from "next/image";
import { useEffect } from "react";

type QuoteRow = {
  id: string;
  code: string;
  client: string;
  seller: string;
  warehouse: string;
  total: string;
  taxId: string;
  phone: string;
  address: string;
  deliveryAddress: string;
  discount: string;
  date: string;
  status: { label: string };
  items: Array<{ product: string; color: string; quantity: string; unitPrice: string; subtotal: string }>;
};

export function QuotePrintLauncher({ quote }: { quote?: QuoteRow }) {
  useEffect(() => {
    if (!quote) return;
    const cleanup = () => {
      document.body.classList.remove("printing-quote");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    document.body.classList.add("printing-quote");
    const timer = window.setTimeout(() => window.print(), 120);
    return () => {
      window.clearTimeout(timer);
      cleanup();
    };
  }, [quote]);

  if (!quote) return null;

  return (
    <div className="quote-print-stage">
      <article className="quote-print-target">
        <header className="quote-print-header">
          <div className="quote-print-brand-block">
            <Image alt="PERFLOPLAST" height={68} src="/company-logo.svg.png" width={96} />
            <div>
              <p className="quote-print-brand">PERFLOPLAST</p>
              <p>Industria de plastico</p>
              <p>Aldea Chijou, Santa Cruz Verapaz</p>
              <p>Tel: 44235941 / 53146115</p>
            </div>
          </div>
          <div>
            <p>Cotizacion comercial</p>
            <h1>Cotizacion</h1>
            <strong>{quote.code}</strong>
          </div>
        </header>

        <section className="quote-print-meta">
          <div><span>Cliente</span><strong>{quote.client}</strong></div>
          <div><span>NIT</span><strong>{quote.taxId}</strong></div>
          <div><span>Telefono</span><strong>{quote.phone}</strong></div>
          <div><span>Fecha</span><strong>{quote.date}</strong></div>
          <div><span>Vendedor</span><strong>{quote.seller}</strong></div>
          <div><span>Bodega referencia</span><strong>{quote.warehouse}</strong></div>
        </section>

        <section className="quote-print-address">
          <div><span>Direccion fiscal</span><strong>{quote.address}</strong></div>
          <div><span>Direccion de entrega</span><strong>{quote.deliveryAddress}</strong></div>
        </section>

        <section className="quote-print-note">
          <strong>Cotizacion sin descuento de stock.</strong>
          <span>Documento informativo para el cliente. La disponibilidad puede cambiar hasta confirmar la preventa o venta.</span>
        </section>

        <section className="quote-print-table">
          <h2>Detalle de productos</h2>
          <table>
            <thead>
              <tr><th>Producto</th><th>Color</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={`${item.product}-${index}`}>
                  <td>{item.product}</td>
                  <td>{item.color}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice}</td>
                  <td>{item.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="quote-print-totals">
          <p><span>Descuento</span><strong>{quote.discount}</strong></p>
          <p><span>Total cotizado</span><strong>{quote.total}</strong></p>
        </section>

        <footer>
          <span>Generado por {quote.seller}</span>
          <span>Documento valido como cotizacion, no como factura.</span>
        </footer>
      </article>
    </div>
  );
}
