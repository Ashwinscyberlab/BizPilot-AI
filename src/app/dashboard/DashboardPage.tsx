import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  Inbox,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useDataStore } from "@/src/hooks/useDataStore";
import { formatCurrency, formatDate } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Skeleton } from "@/src/components/ui/skeleton";
import { StatusIndicator } from "@/src/components/ui/status-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import type { Product } from "@/src/types";

export function DashboardPage() {
  const {
    dashboardMetrics,
    revenueSeries,
    orders,
    enquiries,
    products,
    settings,
    isRefreshing,
    dataError,
    refreshAll,
    adjustStock,
  } = useDataStore();
  const navigate = useNavigate();

  const [chartType, setChartType] = useState<"revenue" | "orders">("revenue");
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState("15");
  const [restockNote, setRestockNote] = useState("Replenishment order");
  const [isSavingRestock, setIsSavingRestock] = useState(false);

  const lowStockProducts = products.filter(
    (p) => p.quantity <= p.lowStockThreshold
  );
  const recentOrders = orders.slice(0, 5);
  const recentEnquiries = enquiries.slice(0, 5);

  async function handleRestockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!restockProduct) return;
    const qty = Number.parseInt(restockQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a positive restock quantity");
      return;
    }
    setIsSavingRestock(true);
    try {
      await adjustStock({
        productId: restockProduct.id,
        delta: qty,
        reason: "Restock",
        note: restockNote || "Dashboard quick restock",
      });
      toast.success(`Added ${qty} units to ${restockProduct.name}`);
      setRestockProduct(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restock");
    } finally {
      setIsSavingRestock(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Operations Overview
          </h2>
          <p className="text-sm text-slate-500">
            Live revenue, order pipeline, customer enquiries, and stock alerts.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshAll()}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/orders?new=1")}
          >
            New Order
          </Button>
        </div>
      </div>

      {dataError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{dataError}</span>
          <Button variant="outline" size="sm" onClick={() => refreshAll()}>
            Retry
          </Button>
        </div>
      )}

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Total Revenue</span>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            {isRefreshing ? (
              <Skeleton className="mt-3 h-7 w-28" />
            ) : (
              <div className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {formatCurrency(dashboardMetrics.totalRevenue, settings.currency)}
              </div>
            )}
            <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-700 font-medium tabular-nums">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+{dashboardMetrics.revenueGrowthPct}% vs prior period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Total Orders</span>
              <ShoppingCart className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {dashboardMetrics.totalOrders}
            </div>
            <Link
              to="/orders"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
            >
              View all orders
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Pending Orders</span>
              <ShoppingCart className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {dashboardMetrics.pendingOrders}
            </div>
            <Link
              to="/orders?status=Pending"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline"
            >
              Needs fulfillment
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Total Customers</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {dashboardMetrics.totalCustomers}
            </div>
            <Link
              to="/customers"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
            >
              Manage directory
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Low-Stock Products</span>
              <AlertTriangle
                className={`h-4 w-4 ${
                  dashboardMetrics.lowStockCount > 0
                    ? "text-red-600"
                    : "text-slate-400"
                }`}
              />
            </div>
            <div className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {dashboardMetrics.lowStockCount}
            </div>
            <Link
              to="/products?lowStock=1"
              className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium hover:underline ${
                dashboardMetrics.lowStockCount > 0
                  ? "text-red-700"
                  : "text-emerald-700"
              }`}
            >
              {dashboardMetrics.lowStockCount > 0
                ? "Review stock alerts"
                : "All stock healthy"}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Sales Overview + Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>
                Monthly revenue and order volume over the last 6 months.
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 p-1 self-start">
              <button
                type="button"
                onClick={() => setChartType("revenue")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  chartType === "revenue"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setChartType("orders")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  chartType === "orders"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Orders
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "revenue" ? (
                  <AreaChart
                    data={revenueSeries}
                    margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="navyRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [
                        formatCurrency(Number(value), settings.currency),
                        "Revenue",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#1E3A8A"
                      strokeWidth={2}
                      fill="url(#navyRevenueFill)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={revenueSeries}
                    margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="orders" name="Orders" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Inventory Alerts</CardTitle>
              <CardDescription>
                Items at or below reorder threshold.
              </CardDescription>
            </div>
            <Link
              to="/products"
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              Catalogue
            </Link>
          </CardHeader>
          <CardContent className="flex-1 divide-y divide-slate-100 p-0">
            {lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                All products are above minimum stock levels.
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {product.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 font-mono-tabular">
                      {product.sku} · {product.quantity} left (min{" "}
                      {product.lowStockThreshold})
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRestockProduct(product);
                      setRestockQty("15");
                      setRestockNote("Replenishment shipment");
                    }}
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    Restock
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Recent Enquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest customer orders and statuses.</CardDescription>
            </div>
            <Link
              to="/orders"
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No orders recorded yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      onClick={() => navigate(`/orders?order=${order.id}`)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <div className="font-mono-tabular text-xs font-semibold text-slate-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {order.customerName}
                      </TableCell>
                      <TableCell>
                        <StatusIndicator status={order.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono-tabular font-medium text-slate-900">
                        {formatCurrency(order.total, settings.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Enquiries</CardTitle>
              <CardDescription>Incoming customer messages and leads.</CardDescription>
            </div>
            <Link
              to="/enquiries"
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              Inbox
            </Link>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {recentEnquiries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No customer enquiries yet.
              </div>
            ) : (
              recentEnquiries.map((enq) => (
                <button
                  key={enq.id}
                  type="button"
                  onClick={() => navigate(`/enquiries?enquiry=${enq.id}`)}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer block"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {enq.subject}
                    </span>
                    <StatusIndicator status={enq.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Inbox className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{enq.customerName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="whitespace-nowrap">
                      {formatDate(enq.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Restock Dialog */}
      <Dialog
        open={Boolean(restockProduct)}
        onOpenChange={(open) => !open && setRestockProduct(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Inventory</DialogTitle>
            <DialogDescription>
              Add incoming units for {restockProduct?.name} ({restockProduct?.sku}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRestockSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="restock-qty">Quantity to Add</Label>
              <Input
                id="restock-qty"
                type="number"
                min={1}
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="restock-note">Reference Note</Label>
              <Input
                id="restock-note"
                value={restockNote}
                onChange={(e) => setRestockNote(e.target.value)}
                placeholder="Supplier PO number or note"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRestockProduct(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSavingRestock}>
                {isSavingRestock ? "Updating..." : "Confirm Restock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
