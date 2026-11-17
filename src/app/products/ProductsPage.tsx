import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownUp,
  Edit2,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useDataStore } from "@/src/hooks/useDataStore";
import {
  productSchema,
  stockAdjustmentSchema,
  type ProductFormValues,
  type StockAdjustmentFormValues,
} from "@/src/schemas";
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
import { Switch } from "@/src/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Textarea } from "@/src/components/ui/textarea";
import type { Product, StockAdjustmentReason } from "@/src/types";

const PAGE_SIZE = 7;

export function ProductsPage() {
  const {
    products,
    adjustments,
    settings,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
  } = useDataStore();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);

  useEffect(() => {
    if (searchParams.get("lowStock") === "1") {
      setLowStockOnly(true);
    }
  }, [searchParams]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat =
        categoryFilter === "All" || p.category === categoryFilter;
      const matchesLow = !lowStockOnly || p.quantity <= p.lowStockThreshold;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesCat && matchesLow && matchesQuery;
    });
  }, [products, search, categoryFilter, lowStockOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Product Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "Workspace",
      price: 0,
      costPrice: 0,
      quantity: 0,
      lowStockThreshold: 5,
      description: "",
      imageUrl: "",
    },
  });

  // Stock Adjustment Form
  const adjForm = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      productId: "",
      delta: 10,
      reason: "Restock",
      note: "",
    },
  });

  const adjReason = adjForm.watch("reason");

  function openCreateProduct() {
    setEditingProduct(null);
    reset({
      name: "",
      sku: "",
      category: "Workspace",
      price: 49,
      costPrice: 20,
      quantity: 20,
      lowStockThreshold: 5,
      description: "",
      imageUrl: "",
    });
    setProductDialogOpen(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    reset({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      costPrice: product.costPrice,
      quantity: product.quantity,
      lowStockThreshold: product.lowStockThreshold,
      description: product.description || "",
      imageUrl: product.imageUrl || "",
    });
    setProductDialogOpen(true);
  }

  function openAdjustStock(product: Product) {
    setAdjustTarget(product);
    adjForm.reset({
      productId: product.id,
      delta: 10,
      reason: "Restock",
      note: "",
    });
  }

  async function onProductSubmit(values: ProductFormValues) {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, values);
        toast.success("Product updated");
      } else {
        await createProduct(values);
        toast.success("Product added to catalogue");
      }
      setProductDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product");
    }
  }

  async function onAdjustSubmit(values: StockAdjustmentFormValues) {
    try {
      const adj = await adjustStock(values);
      toast.success(
        `Stock updated: ${adj.productName} is now ${adj.newQuantity} units`
      );
      setAdjustTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stock adjustment failed");
    }
  }

  function getStockStatus(p: Product) {
    if (p.quantity <= 0) return "Out of Stock";
    if (p.quantity <= p.lowStockThreshold) return "Low Stock";
    return "In Stock";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Products & Inventory
          </h2>
          <p className="text-sm text-slate-500">
            Maintain product catalogue, stock thresholds, and full stock audit history.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateProduct}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Tabs defaultValue="catalogue">
        <TabsList>
          <TabsTrigger value="catalogue">
            Catalogue ({products.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Stock Adjustment History ({adjustments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue">
          <Card>
            <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search name, SKU, category..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9"
                  />
                </div>

                <Select
                  value={categoryFilter}
                  onValueChange={(val) => {
                    setCategoryFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "All" ? "All Categories" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2.5">
                <Switch
                  id="low-stock-toggle"
                  checked={lowStockOnly}
                  onCheckedChange={(checked) => {
                    setLowStockOnly(checked);
                    setPage(1);
                  }}
                />
                <Label htmlFor="low-stock-toggle" className="cursor-pointer">
                  Low stock only
                </Label>
              </div>
            </div>

            {paginated.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Package}
                  title="No products match your filters"
                  description="Clear active search filters or add a new SKU to your catalogue."
                  actionLabel="Add Product"
                  onAction={openCreateProduct}
                />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead>Stock Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                referrerPolicy="no-referrer"
                                className="h-10 w-10 rounded-md border border-slate-200 object-cover shrink-0 bg-slate-50"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-500">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">
                                {product.name}
                              </div>
                              <div className="text-xs text-slate-500 truncate max-w-xs">
                                {product.description || "No description"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono-tabular text-xs text-slate-600">
                          {product.sku}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {product.category}
                        </TableCell>
                        <TableCell className="text-right font-mono-tabular font-medium text-slate-900">
                          {formatCurrency(product.price, settings.currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono-tabular">
                          <span className="font-semibold text-slate-900">
                            {product.quantity}
                          </span>
                          <span className="text-xs text-slate-400">
                            {" "}
                            / min {product.lowStockThreshold}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusIndicator status={getStockStatus(product)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustStock(product)}
                              title="Adjust stock"
                            >
                              <ArrowDownUp className="h-3.5 w-3.5" />
                              Stock
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditProduct(product)}
                              title="Edit product"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(product)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </TabsContent>

        <TabsContent value="history">
          <Card>
            {adjustments.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={ArrowDownUp}
                  title="No stock adjustments recorded"
                  description="Stock movements from orders, restocks, and audits appear here."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Resulting Stock</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj) => (
                    <TableRow key={adj.id}>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(adj.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">
                          {adj.productName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono-tabular">
                          {adj.sku}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {adj.reason}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono-tabular font-semibold ${
                          adj.delta > 0 ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {adj.delta > 0 ? `+${adj.delta}` : adj.delta}
                      </TableCell>
                      <TableCell className="text-right font-mono-tabular text-slate-800">
                        {adj.previousQuantity} →{" "}
                        <span className="font-semibold">{adj.newQuantity}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                        {adj.note || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription>
              Configure SKU pricing, inventory quantity, and reorder alerts.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onProductSubmit)} className="space-y-4" noValidate>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-name">Product Name</Label>
                <Input id="prod-name" {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-sku">SKU</Label>
                <Input id="prod-sku" className="font-mono-tabular" {...register("sku")} />
                {errors.sku && (
                  <p className="text-xs text-red-600">{errors.sku.message}</p>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-cat">Category</Label>
                <Input id="prod-cat" {...register("category")} />
                {errors.category && (
                  <p className="text-xs text-red-600">{errors.category.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-price">Selling Price</Label>
                <Input
                  id="prod-price"
                  type="number"
                  step="0.01"
                  {...register("price", { valueAsNumber: true })}
                />
                {errors.price && (
                  <p className="text-xs text-red-600">{errors.price.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-cost">Cost Price</Label>
                <Input
                  id="prod-cost"
                  type="number"
                  step="0.01"
                  {...register("costPrice", { valueAsNumber: true })}
                />
                {errors.costPrice && (
                  <p className="text-xs text-red-600">{errors.costPrice.message}</p>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-qty">Quantity on Hand</Label>
                <Input
                  id="prod-qty"
                  type="number"
                  {...register("quantity", { valueAsNumber: true })}
                />
                {errors.quantity && (
                  <p className="text-xs text-red-600">{errors.quantity.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-threshold">Low-Stock Threshold</Label>
                <Input
                  id="prod-threshold"
                  type="number"
                  {...register("lowStockThreshold", { valueAsNumber: true })}
                />
                {errors.lowStockThreshold && (
                  <p className="text-xs text-red-600">
                    {errors.lowStockThreshold.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-desc">Description</Label>
              <Textarea id="prod-desc" rows={2} {...register("description")} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingProduct
                  ? "Save Product"
                  : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog
        open={Boolean(adjustTarget)}
        onOpenChange={(open) => !open && setAdjustTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock Quantity</DialogTitle>
            <DialogDescription>
              {adjustTarget?.name} ({adjustTarget?.sku}) · Current stock:{" "}
              <span className="font-semibold text-slate-900">
                {adjustTarget?.quantity}
              </span>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={adjForm.handleSubmit(onAdjustSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="adj-delta">
                Quantity Change (use negative to deduct)
              </Label>
              <Input
                id="adj-delta"
                type="number"
                className="font-mono-tabular"
                {...adjForm.register("delta", { valueAsNumber: true })}
              />
              {adjForm.formState.errors.delta && (
                <p className="text-xs text-red-600">
                  {adjForm.formState.errors.delta.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select
                value={adjReason}
                onValueChange={(val) =>
                  adjForm.setValue("reason", val as StockAdjustmentReason)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Restock">Restock</SelectItem>
                  <SelectItem value="Customer Return">Customer Return</SelectItem>
                  <SelectItem value="Inventory Audit">Inventory Audit</SelectItem>
                  <SelectItem value="Damaged / Spoilage">
                    Damaged / Spoilage
                  </SelectItem>
                  <SelectItem value="Order Fulfillment">
                    Order Fulfillment
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-note">Audit Note</Label>
              <Input
                id="adj-note"
                placeholder="Supplier receipt, cycle count ID..."
                {...adjForm.register("note")}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={adjForm.formState.isSubmitting}
              >
                Apply Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Product Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Remove{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget?.name}
              </span>{" "}
              from the active product catalogue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
