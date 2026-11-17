import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { jsPDF } from "jspdf";
import type { BusinessSettings, Invoice } from "@/src/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_LOCALES: Record<BusinessSettings["currency"], string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  CAD: "en-CA",
  AUD: "en-AU",
  INR: "en-IN",
};

export function formatCurrency(
  amount: number,
  currency: BusinessSettings["currency"] = "USD"
): string {
  const locale = CURRENCY_LOCALES[currency] || "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: string | number) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateInvoicePdf(invoice: Invoice, settings: BusinessSettings): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  // Header band
  doc.setFillColor(15, 23, 42); // Slate-900 Navy
  doc.rect(0, 0, pageWidth, 96, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(settings.businessName, margin, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(`${settings.businessEmail}  |  ${settings.phone}`, margin, 66);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INVOICE", pageWidth - margin, 44, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(invoice.invoiceNumber, pageWidth - margin, 64, { align: "right" });

  // Metadata & Billing columns
  let y = 136;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("FROM", margin, y);
  doc.text("BILL TO", 240, y);
  doc.text("INVOICE DETAILS", pageWidth - margin, y, { align: "right" });

  y += 16;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(settings.businessName, margin, y);
  doc.text(invoice.customerName, 240, y);
  doc.text(`Status: ${invoice.status}`, pageWidth - margin, y, { align: "right" });

  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(settings.address, margin, y);
  doc.text(invoice.customerEmail, 240, y);
  doc.text(`Issued: ${formatDate(invoice.issuedAt)}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 14;
  doc.text(`${settings.city}, ${settings.country}`, margin, y);
  const wrappedAddr = doc.splitTextToSize(invoice.customerAddress, 160);
  doc.text(wrappedAddr, 240, y);
  doc.text(`Due: ${formatDate(invoice.dueAt)}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 14;
  doc.text(`Order Ref: ${invoice.orderNumber}`, pageWidth - margin, y, {
    align: "right",
  });

  // Table header
  y = Math.max(y + 40, 245);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 26, "F");
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ITEM DESCRIPTION", margin + 10, y + 17);
  doc.text("QTY", 350, y + 17, { align: "right" });
  doc.text("UNIT PRICE", 445, y + 17, { align: "right" });
  doc.text("AMOUNT", pageWidth - margin - 10, y + 17, { align: "right" });

  y += 38;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const item of invoice.items) {
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
    doc.setTextColor(15, 23, 42);
    doc.text(item.description, margin + 10, y);
    if (item.sku) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`SKU: ${item.sku}`, margin + 10, y + 12);
      doc.setFontSize(10);
    }
    doc.setTextColor(51, 65, 85);
    doc.text(String(item.quantity), 350, y, { align: "right" });
    doc.text(formatCurrency(item.unitPrice, settings.currency), 445, y, {
      align: "right",
    });
    doc.setTextColor(15, 23, 42);
    doc.text(
      formatCurrency(item.total, settings.currency),
      pageWidth - margin - 10,
      y,
      { align: "right" }
    );

    y += item.sku ? 30 : 22;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y - 6, pageWidth - margin, y - 6);
  }

  // Totals block
  y += 16;
  const summaryX = 360;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal", summaryX, y);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(invoice.subtotal, settings.currency), pageWidth - margin - 10, y, {
    align: "right",
  });

  y += 18;
  doc.setTextColor(71, 85, 105);
  doc.text(`${settings.taxLabel} (${invoice.taxRate}%)`, summaryX, y);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(invoice.taxAmount, settings.currency), pageWidth - margin - 10, y, {
    align: "right",
  });

  y += 12;
  doc.setDrawColor(15, 23, 42);
  doc.line(summaryX, y, pageWidth - margin, y);

  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total Due", summaryX, y);
  doc.text(formatCurrency(invoice.total, settings.currency), pageWidth - margin - 10, y, {
    align: "right",
  });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Thank you for your business. Payment terms: Net ${settings.invoicePaymentTermsDays} days.`,
    margin,
    780
  );

  doc.save(`${invoice.invoiceNumber}.pdf`);
}
