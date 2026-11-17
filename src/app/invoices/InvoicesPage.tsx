import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Eye, FileText, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useDataStore } from "@/src/hooks/useDataStore";
import {
  formatCurrency,
  formatDate,
  generateInvoicePdf,
} from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Pagination } from "@/src/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { StatusIndicator } from "@/src/components/ui/status-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import type { Invoice, InvoiceStatus } from "@/src/types";

const PAGE_SIZE = 7;
const INVOICE_STATUSES: Array<"All" | InvoiceStatus> = [
  "All",
  "Paid",
  "Unpaid",
  "Overdue",
];

export function InvoicesPage() {
  const {
    invoices,
    orders,
    settings,
    generateInvoiceFromOrder,
    updateInvoiceStatus,
  } = useDataStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | InvoiceStatus>("All");
  const [page, setPage] = useState(1);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    const paramId = searchParams.get("invoice");
    if (paramId && invoices.some((i) => i.id === paramId)) {
      setPreviewInvoiceId(paramId);
    }
  }, [searchParams, invoices]);

  const uninvoicedOrders = useMemo(() => {
    const invoicedIds = new Set(invoices.map((i) => i.orderId));
    return orders.filter(
      (o) => !invoicedIds.has(o.id) && o.status !== "Cancelled"
    );
  }, [orders, invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
      const matchesQuery =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.orderNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [invoices, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const previewInvoice: Invoice | null = useMemo(
    () => invoices.find((i) => i.id === previewInvoiceId) || null,
    [invoices, previewInvoiceId]
  );

  function closePreview() {
    setPreviewInvoiceId(null);
    if (searchParams.has("invoice")) {
      searchParams.delete("invoice");
      setSearchParams(searchParams);
    }
  }

  function openGenerateDialog() {
    setSelectedOrderId(uninvoicedOrders[0]?.id || "");
    setGenerateOpen(true);
  }

  async function handleGenerateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrderId) return;
    setIsGenerating(true);
    try {
      const created = await generateInvoiceFromOrder(selectedOrderId);
      toast.success(`Invoice ${created.invoiceNumber} generated`);
      setGenerateOpen(false);
      setPreviewInvoiceId(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invoice");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleStatusChange(id: string, status: InvoiceStatus) {
    try {
      await updateInvoiceStatus(id, status);
      toast.success(`Invoice marked as ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  function handleDownloadPdf(invoice: Invoice) {
    try {
      generateInvoicePdf(invoice, settings);
      toast.success(`Downloaded ${invoice.invoiceNumber}.pdf`);
    } catch {
      toast.error("Unable to generate PDF");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Invoices
          </h2>
          <p className="text-sm text-slate-500">
            Generate tax-ready invoices from orders, track payments, and export PDFs.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openGenerateDialog}>
          <Plus className="h-4 w-4" />
          Generate from Order
        </Button>
      </div>

      <Card>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search invoice #, order #, customer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 p-1 self-start lg:self-auto">
            {INVOICE_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {paginated.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="No invoices found"
              description="Generate an invoice from any existing customer order."
              actionLabel="Generate from Order"
              onAction={openGenerateDialog}
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Order Ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((inv) => (
                  <TableRow
                    key={inv.id}
                    onClick={() => setPreviewInvoiceId(inv.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono-tabular font-semibold text-slate-900">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="font-mono-tabular text-xs text-slate-600">
                      {inv.orderNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">
                        {inv.customerName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {inv.customerEmail}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(inv.issuedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(inv.dueAt)}
                    </TableCell>
                    <TableCell>
                      <StatusIndicator status={inv.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono-tabular font-semibold text-slate-900">
                      {formatCurrency(inv.total, settings.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewInvoiceId(inv.id);
                          }}
                          title="Preview invoice"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPdf(inv);
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Generate from Order Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice from Order</DialogTitle>
            <DialogDescription>
              Select an order to issue an itemized invoice with current business tax settings.
            </DialogDescription>
          </DialogHeader>

          {uninvoicedOrders.length === 0 ? (
            <div className="py-4 text-sm text-slate-600">
              All active orders already have corresponding invoices.
            </div>
          ) : (
            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Select Order</Label>
                <Select
                  value={selectedOrderId}
                  onValueChange={setSelectedOrderId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose order..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uninvoicedOrders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.orderNumber} — {o.customerName} (
                        {formatCurrency(o.total, settings.currency)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGenerateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!selectedOrderId || isGenerating}
                >
                  {isGenerating ? "Generating..." : "Generate Invoice"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Document Preview Dialog */}
      <Dialog
        open={Boolean(previewInvoice)}
        onOpenChange={(open) => !open && closePreview()}
      >
        <DialogContent className="max-w-2xl">
          {previewInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono-tabular">
                  {previewInvoice.invoiceNumber}
                </DialogTitle>
                <DialogDescription>
                  Order reference {previewInvoice.orderNumber} · Issued{" "}
                  {formatDate(previewInvoice.issuedAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Business & Customer Header */}
                <div className="grid sm:grid-cols-2 gap-6 rounded-md border border-slate-200 bg-slate-50/70 p-4 text-xs">
                  <div>
                    <div className="font-semibold text-slate-500">FROM</div>
                    <div className="mt-1.5 text-sm font-semibold text-slate-900">
                      {settings.businessName}
                    </div>
                    <div className="mt-0.5 text-slate-600">
                      {settings.address}
                      <br />
                      {settings.city}, {settings.country}
                      <br />
                      {settings.businessEmail} · {settings.phone}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500">BILL TO</div>
                    <div className="mt-1.5 text-sm font-semibold text-slate-900">
                      {previewInvoice.customerName}
                    </div>
                    <div className="mt-0.5 text-slate-600">
                      {previewInvoice.customerAddress}
                      <br />
                      {previewInvoice.customerEmail}
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    Due Date:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatDate(previewInvoice.dueAt)}
                    </span>
                    {previewInvoice.paidAt && (
                      <>
                        {" "}
                        · Paid on{" "}
                        <span className="font-semibold text-emerald-700">
                          {formatDate(previewInvoice.paidAt)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="w-40">
                    <Select
                      value={previewInvoice.status}
                      onValueChange={(val) =>
                        handleStatusChange(previewInvoice.id, val as InvoiceStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Line Items */}
                <div className="rounded-md border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewInvoice.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="font-medium text-slate-900">
                              {item.description}
                            </div>
                            {item.sku && (
                              <div className="text-xs text-slate-500 font-mono-tabular">
                                SKU: {item.sku}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono-tabular">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono-tabular">
                            {formatCurrency(item.unitPrice, settings.currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono-tabular font-medium text-slate-900">
                            {formatCurrency(item.total, settings.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="flex flex-col items-end space-y-1.5 text-sm">
                  <div className="flex w-60 justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono-tabular">
                      {formatCurrency(previewInvoice.subtotal, settings.currency)}
                    </span>
                  </div>
                  <div className="flex w-60 justify-between text-slate-600">
                    <span>
                      {settings.taxLabel} ({previewInvoice.taxRate}%)
                    </span>
                    <span className="font-mono-tabular">
                      {formatCurrency(previewInvoice.taxAmount, settings.currency)}
                    </span>
                  </div>
                  <div className="flex w-60 justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                    <span>Total</span>
                    <span className="font-mono-tabular text-base">
                      {formatCurrency(previewInvoice.total, settings.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="sm:justify-between">
                <Button
                  variant="primary"
                  onClick={() => handleDownloadPdf(previewInvoice)}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={closePreview}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
