import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDataStore } from "@/src/hooks/useDataStore";
import { orderSchema, type OrderFormValues } from "@/src/schemas";
import { formatCurrency, formatDateTime } from "@/src/lib/utils";
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
import { Textarea } from "@/src/components/ui/textarea";
import type { Order, OrderStatus } from "@/src/types";

const PAGE_SIZE = 7;
const ORDER_STATUSES: Array<"All" | OrderStatus> = [
  "All",
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export function OrdersPage() {
  const {
    orders,
    customers,
    products,
    invoices,
    settings,
    createOrder,
    updateOrderStatus,
    generateInvoiceFromOrder,
  } = useDataStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isGeneratingInv, setIsGeneratingInv] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: customers[0]?.id || "",
      items: [{ productId: products[0]?.id || "", quantity: 1 }],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  useEffect(() => {
    const statusParam = searchParams.get("status") as OrderStatus | null;
    if (statusParam && ORDER_STATUSES.includes(statusParam)) {
      setStatusFilter(statusParam);
    }
    const orderParam = searchParams.get("order");
    if (orderParam && orders.some((o) => o.id === orderParam)) {
      setSelectedOrderId(orderParam);
    }
    if (searchParams.get("new") === "1") {
      const custId = searchParams.get("customerId") || customers[0]?.id || "";
      reset({
        customerId: custId,
        items: [{ productId: products[0]?.id || "", quantity: 1 }],
        notes: "",
      });
      setCreateOpen(true);
    }
  }, [searchParams, orders, customers, products, reset]);

  const watchedCustomerId = watch("customerId");
  const watchedItems = watch("items");

  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    for (const item of watchedItems || []) {
      const prod = products.find((p) => p.id === item.productId);
      const qty = Number(item.quantity) || 0;
      if (prod && qty > 0) {
        subtotal += prod.price * qty;
      }
    }
    const taxAmount = subtotal * (settings.taxRate / 100);
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }, [watchedItems, products, settings.taxRate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesStatus = statusFilter === "All" || o.status === statusFilter;
      const matchesQuery =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [orders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedOrder: Order | null = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const existingInvoiceForOrder = useMemo(
    () =>
      selectedOrder
        ? invoices.find((inv) => inv.orderId === selectedOrder.id)
        : undefined,
    [invoices, selectedOrder]
  );

  function openCreate() {
    reset({
      customerId: customers[0]?.id || "",
      items: [{ productId: products[0]?.id || "", quantity: 1 }],
      notes: "",
    });
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    if (searchParams.has("new") || searchParams.has("customerId")) {
      searchParams.delete("new");
      searchParams.delete("customerId");
      setSearchParams(searchParams);
    }
  }

  function closeDetail() {
    setSelectedOrderId(null);
    if (searchParams.has("order")) {
      searchParams.delete("order");
      setSearchParams(searchParams);
    }
  }

  async function onCreateSubmit(values: OrderFormValues) {
    try {
      const created = await createOrder(values);
      toast.success(`Order ${created.orderNumber} created`);
      closeCreate();
      setSelectedOrderId(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    }
  }

  async function handleStatusUpdate(orderId: string, status: OrderStatus) {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order status updated to ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleGenerateInvoice(orderId: string) {
    setIsGeneratingInv(true);
    try {
      const inv = await generateInvoiceFromOrder(orderId);
      toast.success(`Invoice ${inv.invoiceNumber} ready`);
      closeDetail();
      navigate(`/invoices?invoice=${inv.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invoice");
    } finally {
      setIsGeneratingInv(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Orders
          </h2>
          <p className="text-sm text-slate-500">
            Create customer orders, track fulfillment, and convert orders to invoices.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Order
        </Button>
      </div>

      <Card>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search order # or customer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1 self-start lg:self-auto">
            {ORDER_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
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
              icon={ShoppingCart}
              title="No matching orders"
              description="Create a new customer order or clear your status filter."
              actionLabel="Create Order"
              onAction={openCreate}
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((order) => (
                  <TableRow
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono-tabular font-semibold text-slate-900">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">
                        {order.customerName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.customerEmail}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 tabular-nums">
                      {order.items.reduce((s, i) => s + i.quantity, 0)} units
                    </TableCell>
                    <TableCell>
                      <StatusIndicator status={order.status} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right font-mono-tabular font-semibold text-slate-900">
                      {formatCurrency(order.total, settings.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderId(order.id);
                        }}
                      >
                        Details
                      </Button>
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

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && closeCreate()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
            <DialogDescription>
              Select a customer and line items. Inventory adjusts automatically upon creation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select
                value={watchedCustomerId}
                onValueChange={(val) => setValue("customerId", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && (
                <p className="text-xs text-red-600">{errors.customerId.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Order Line Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ productId: products[0]?.id || "", quantity: 1 })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Product
                </Button>
              </div>

              <div className="space-y-2.5">
                {fields.map((field, index) => {
                  const selectedProdId = watchedItems?.[index]?.productId;
                  const prod = products.find((p) => p.id === selectedProdId);
                  const qty = Number(watchedItems?.[index]?.quantity) || 0;
                  const lineTotal = prod ? prod.price * qty : 0;

                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-2.5 items-start rounded-md border border-slate-200 p-3 bg-slate-50/40"
                    >
                      <div className="col-span-12 sm:col-span-6 space-y-1">
                        <Select
                          value={selectedProdId}
                          onValueChange={(val) =>
                            setValue(`items.${index}.productId`, val)
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Choose product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.quantity} in stock ·{" "}
                                {formatCurrency(p.price, settings.currency)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-5 sm:col-span-2 space-y-1">
                        <Input
                          type="number"
                          min={1}
                          className="bg-white font-mono-tabular"
                          {...register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>

                      <div className="col-span-5 sm:col-span-3 flex h-10 items-center justify-end font-mono-tabular text-sm font-medium text-slate-900">
                        {formatCurrency(lineTotal, settings.currency)}
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex h-10 items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={fields.length <= 1}
                          onClick={() => remove(index)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {errors.items && (
                <p className="text-xs text-red-600">
                  {errors.items.message || "Check product quantities"}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="order-notes">Fulfillment Notes (Optional)</Label>
              <Textarea
                id="order-notes"
                rows={2}
                placeholder="Delivery window, packaging instructions..."
                {...register("notes")}
              />
            </div>

            {/* Calculation Summary */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono-tabular">
                  {formatCurrency(calculatedTotals.subtotal, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>
                  {settings.taxLabel} ({settings.taxRate}%)
                </span>
                <span className="font-mono-tabular">
                  {formatCurrency(calculatedTotals.taxAmount, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <span>Order Total</span>
                <span className="font-mono-tabular text-base">
                  {formatCurrency(calculatedTotals.total, settings.currency)}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreate}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Place Order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => !open && closeDetail()}
      >
        <DialogContent className="max-w-2xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono-tabular">
                  {selectedOrder.orderNumber}
                </DialogTitle>
                <DialogDescription>
                  Placed on {formatDateTime(selectedOrder.createdAt)} by{" "}
                  {selectedOrder.customerName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-slate-200 bg-slate-50/70 p-3.5">
                  <div>
                    <div className="text-xs text-slate-500">Customer</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedOrder.customerName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedOrder.customerEmail}
                    </div>
                  </div>
                  <div className="w-full sm:w-44">
                    <Label className="mb-1 block">Order Status</Label>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(val) =>
                        handleStatusUpdate(selectedOrder.id, val as OrderStatus)
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item, idx) => (
                        <TableRow key={`${item.productId}-${idx}`}>
                          <TableCell>
                            <div className="font-medium text-slate-900">
                              {item.productName}
                            </div>
                            <div className="text-xs text-slate-500 font-mono-tabular">
                              {item.sku}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono-tabular">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono-tabular">
                            {formatCurrency(item.unitPrice, settings.currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono-tabular font-medium text-slate-900">
                            {formatCurrency(item.lineTotal, settings.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col items-end space-y-1.5 text-sm">
                  <div className="flex w-56 justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono-tabular">
                      {formatCurrency(selectedOrder.subtotal, settings.currency)}
                    </span>
                  </div>
                  <div className="flex w-56 justify-between text-slate-600">
                    <span>Tax ({selectedOrder.taxRate}%)</span>
                    <span className="font-mono-tabular">
                      {formatCurrency(selectedOrder.taxAmount, settings.currency)}
                    </span>
                  </div>
                  <div className="flex w-56 justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
                    <span>Total</span>
                    <span className="font-mono-tabular">
                      {formatCurrency(selectedOrder.total, settings.currency)}
                    </span>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <span className="font-semibold text-slate-800">Notes: </span>
                    {selectedOrder.notes}
                  </div>
                )}
              </div>

              <DialogFooter className="sm:justify-between">
                {existingInvoiceForOrder ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      closeDetail();
                      navigate(`/invoices?invoice=${existingInvoiceForOrder.id}`);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    View Invoice ({existingInvoiceForOrder.invoiceNumber})
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handleGenerateInvoice(selectedOrder.id)}
                    disabled={isGeneratingInv}
                  >
                    <FileText className="h-4 w-4" />
                    {isGeneratingInv ? "Generating..." : "Generate Invoice"}
                  </Button>
                )}
                <Button variant="outline" onClick={closeDetail}>
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
