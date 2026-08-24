"use client";

import * as React from "react";
import { formatCurrency, formatCurrencyDetailed, getPaymentMethodLabel } from "@/lib/format";

type PrintItem = {
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: { name: string; dosage: string | null; presentation: string | null };
};

type PrintPrescription = {
  doctorName: string;
  doctorLicense?: string | null;
  prescriptionNumber: string;
  prescriptionDate: string;
};

type PrintSale = {
  invoiceNumber: string;
  subtotal: number;
  taxTotal: number;
  discount: number;
  pointsDiscount?: number;
  total: number;
  paymentMethod: string;
  cashReceived: number | null;
  change: number | null;
  cashierName: string;
  createdAt: string;
  customer: { fullName: string; document: string | null } | null;
  items: PrintItem[];
  prescription?: PrintPrescription | null;
};

type PharmacyInfo = {
  name: string;
  tagline: string;
  nit: string;
  phone: string;
  address: string;
  email: string;
};

export default function PrintInvoicePage() {
  const [sale, setSale] = React.useState<PrintSale | null>(null);
  const [pharmacy, setPharmacy] = React.useState<PharmacyInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  // Cargar datos de la venta desde sessionStorage
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem("print-invoice");
      if (!raw) {
        setError("No hay datos de factura para imprimir.");
        return;
      }
      setSale(JSON.parse(raw) as PrintSale);
    } catch {
      setError("Los datos de impresión están corruptos.");
    }
  }, []);

  // Obtener info de la farmacia
  React.useEffect(() => {
    let active = true;
    fetch("/api/settings/pharmacy")
      .then((r) => r.json())
      .then((data) => {
        if (active && data?.pharmacy) setPharmacy(data.pharmacy as PharmacyInfo);
      })
      .catch(() => {
        /* silencioso: usaremos fallback */
      })
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  // Auto-imprimir tras 300ms de tener todo listo
  React.useEffect(() => {
    if (!sale || !ready) return;
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {
        /* noop */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [sale, ready]);

  return (
    <div className="print-root">
      {/* Pantalla de error (no se imprime) */}
      {error && (
        <div className="print-error">
          <p className="print-error__title">No se puede imprimir</p>
          <p className="print-error__msg">{error}</p>
          <button
            className="print-error__btn"
            onClick={() => (window.location.href = "/")}
          >
            Volver al inicio
          </button>
        </div>
      )}

      {/* Recibo térmico 80mm */}
      {sale && (
        <article className="receipt" aria-label="Recibo de venta">
          {pharmacy && (
            <header className="receipt__header">
              <p className="receipt__brand">{pharmacy.name}</p>
              {pharmacy.tagline && (
                <p className="receipt__tagline">{pharmacy.tagline}</p>
              )}
              {pharmacy.nit && <p className="receipt__muted">NIT {pharmacy.nit}</p>}
              {pharmacy.phone && (
                <p className="receipt__muted">Tel: {pharmacy.phone}</p>
              )}
              {pharmacy.address && (
                <p className="receipt__muted">{pharmacy.address}</p>
              )}
              {pharmacy.email && (
                <p className="receipt__muted">{pharmacy.email}</p>
              )}
            </header>
          )}

          <section className="receipt__meta">
            <div className="receipt__row">
              <span>Factura:</span>
              <span className="receipt__bold">{sale.invoiceNumber}</span>
            </div>
            <div className="receipt__row">
              <span>Fecha:</span>
              <span>{new Date(sale.createdAt).toLocaleString("es-CO")}</span>
            </div>
            <div className="receipt__row">
              <span>Cajero:</span>
              <span>{sale.cashierName}</span>
            </div>
            {sale.customer && (
              <>
                <div className="receipt__row">
                  <span>Cliente:</span>
                  <span>{sale.customer.fullName}</span>
                </div>
                {sale.customer.document && (
                  <div className="receipt__row">
                    <span>Doc:</span>
                    <span>{sale.customer.document}</span>
                  </div>
                )}
              </>
            )}
            {!sale.customer && (
              <div className="receipt__row">
                <span>Cliente:</span>
                <span>Consumidor Final</span>
              </div>
            )}
          </section>

          {sale.prescription && (
            <section className="receipt__rx">
              <p className="receipt__section-title">Receta médica</p>
              <div className="receipt__row">
                <span>Médico:</span>
                <span>{sale.prescription.doctorName}</span>
              </div>
              {sale.prescription.doctorLicense && (
                <div className="receipt__row">
                  <span>Licencia:</span>
                  <span>{sale.prescription.doctorLicense}</span>
                </div>
              )}
              <div className="receipt__row">
                <span>No. receta:</span>
                <span>{sale.prescription.prescriptionNumber}</span>
              </div>
              <div className="receipt__row">
                <span>Fecha:</span>
                <span>
                  {new Date(sale.prescription.prescriptionDate).toLocaleDateString(
                    "es-CO"
                  )}
                </span>
              </div>
            </section>
          )}

          <section className="receipt__items">
            <div className="receipt__items-head">
              <span>Cant</span>
              <span>Producto</span>
              <span className="receipt__right">Total</span>
            </div>
            {sale.items.map((it, i) => (
              <div key={i} className="receipt__item">
                <div className="receipt__item-line1">
                  <span className="receipt__qty">{it.quantity}x</span>
                  <span className="receipt__product">
                    {it.product.name}
                    {it.product.dosage ? ` ${it.product.dosage}` : ""}
                  </span>
                </div>
                <div className="receipt__item-line2">
                  <span className="receipt__muted">
                    {formatCurrencyDetailed(it.unitPrice)} c/u
                  </span>
                  <span className="receipt__right">
                    {formatCurrencyDetailed(it.lineTotal)}
                  </span>
                </div>
              </div>
            ))}
          </section>

          <section className="receipt__totals">
            <div className="receipt__row">
              <span>Subtotal:</span>
              <span>{formatCurrencyDetailed(sale.subtotal)}</span>
            </div>
            <div className="receipt__row">
              <span>Impuesto:</span>
              <span>{formatCurrencyDetailed(sale.taxTotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="receipt__row">
                <span>Descuento:</span>
                <span>-{formatCurrencyDetailed(sale.discount)}</span>
              </div>
            )}
            {sale.pointsDiscount && sale.pointsDiscount > 0 && (
              <div className="receipt__row">
                <span>Puntos:</span>
                <span>-{formatCurrencyDetailed(sale.pointsDiscount)}</span>
              </div>
            )}
            <div className="receipt__total">
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </section>

          <section className="receipt__payment">
            <div className="receipt__row">
              <span>Pago ({getPaymentMethodLabel(sale.paymentMethod)}):</span>
              <span>
                {formatCurrencyDetailed(sale.cashReceived ?? sale.total)}
              </span>
            </div>
            {sale.change != null && sale.change > 0 && (
              <div className="receipt__row">
                <span>Cambio:</span>
                <span>{formatCurrencyDetailed(sale.change)}</span>
              </div>
            )}
          </section>

          <footer className="receipt__footer">
            <p>¡Gracias por su compra!</p>
            <p className="receipt__muted">
              {pharmacy?.tagline ?? "Cuidamos de ti"}
            </p>
            <p className="receipt__tiny">
              Conserve este recibo para cambios o devoluciones.
            </p>
          </footer>
        </article>
      )}

      <style jsx global>{`
        /* Pantalla: fondo gris para destacar el ticket */
        .print-root {
          min-height: 100vh;
          background: #f1f5f9;
          padding: 1.5rem 1rem;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .receipt {
          width: 80mm;
          max-width: 100%;
          background: #ffffff;
          padding: 6mm 4mm;
          color: #000000;
          font-size: 11px;
          line-height: 1.45;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .receipt__header,
        .receipt__meta,
        .receipt__rx,
        .receipt__items,
        .receipt__totals,
        .receipt__payment,
        .receipt__footer {
          text-align: center;
        }

        .receipt__header {
          margin-bottom: 4px;
        }

        .receipt__brand {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .receipt__tagline {
          font-style: italic;
          margin: 1px 0 3px;
        }

        .receipt__muted {
          color: #475569;
          font-size: 10px;
        }

        .receipt__tiny {
          font-size: 9px;
          color: #64748b;
        }

        .receipt__meta,
        .receipt__rx,
        .receipt__payment {
          border-top: 1px dashed #cbd5e1;
          border-bottom: 1px dashed #cbd5e1;
          padding: 4px 0;
          margin: 4px 0;
          text-align: left;
        }

        .receipt__section-title {
          font-weight: 700;
          text-align: center;
          margin-bottom: 2px;
          font-size: 10px;
          text-transform: uppercase;
        }

        .receipt__row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 11px;
        }

        .receipt__bold {
          font-weight: 700;
        }

        .receipt__right {
          text-align: right;
        }

        .receipt__items-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          padding-bottom: 2px;
          margin-bottom: 3px;
        }

        .receipt__items-head span:nth-child(1) {
          width: 28px;
        }
        .receipt__items-head span:nth-child(2) {
          flex: 1;
        }

        .receipt__item {
          margin-bottom: 3px;
        }

        .receipt__item-line1,
        .receipt__item-line2 {
          display: flex;
          justify-content: space-between;
          gap: 6px;
        }

        .receipt__qty {
          width: 22px;
          font-weight: 600;
        }

        .receipt__product {
          flex: 1;
          text-align: left;
          font-weight: 500;
        }

        .receipt__totals {
          border-top: 1px solid #000;
          padding-top: 4px;
          margin-top: 4px;
          text-align: left;
        }

        .receipt__total {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 800;
          border-top: 1px solid #000;
          padding-top: 3px;
          margin-top: 3px;
        }

        .receipt__footer {
          margin-top: 6px;
          padding-top: 4px;
          border-top: 1px dashed #cbd5e1;
        }

        .receipt__footer p {
          margin: 1px 0;
        }

        .print-error {
          background: #ffffff;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          max-width: 360px;
          font-family: system-ui, sans-serif;
        }

        .print-error__title {
          font-weight: 700;
          color: #b91c1c;
          font-size: 1.1rem;
          margin: 0 0 0.5rem;
        }

        .print-error__msg {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0 0 1rem;
        }

        .print-error__btn {
          background: #2563eb;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        /* Impresión: ocultar todo excepto el recibo */
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .print-root {
            background: #ffffff !important;
            padding: 0 !important;
            min-height: auto !important;
          }

          .print-error {
            display: none !important;
          }

          .receipt {
            width: 80mm !important;
            box-shadow: none !important;
            padding: 2mm 3mm !important;
          }
        }
      `}</style>
    </div>
  );
}
