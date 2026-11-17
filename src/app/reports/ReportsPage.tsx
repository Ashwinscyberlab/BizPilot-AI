import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useDataStore } from "@/src/hooks/useDataStore";
import { downloadCsv, formatCurrency, formatDate } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { StatusIndicator } from "@/src/components/ui/status-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

export function ReportsPage() {
  const {
    revenueSeries,
    orders,
    products,
    customers,
    bestSellingProducts,
    settings,
  } = useDataStore();

  const [range, setRange] = useState<"30d" | "6m" | "ytd">("6m");

  const filteredRevenueSeries = useMemo(() => {
    if (range === "30d") return revenueSeries.slice(-2);
    return revenueSeries;
  }, [revenueSeries, range]);

  const orderStatusData = useMemo(() => {
    const counts: Record<string, number> = {
      Pending: 0,
      Processing: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
    };
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [orders]);

  const inventorySummary = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
    const retailValue = products.reduce((s, p) => s + p.price * p.quantity, 0);
    const costValue = products.reduce((s, p) => s + p.costPrice * p.quantity, 0);
    const lowStock = products.filter((p) => p.quantity <= p.lowStockThreshold);
    return { totalUnits, retailValue, costValue, lowStock };
  }, [products]);

  const customerActivity = useMemo(() => {
    return customers
      .map((c) => {
        const custOrders = orders.filter(
          (o) => o.customerId === c.id && o.status !== "Cancelled"
        );
        const totalSpend = custOrders.reduce((s, o) => s + o.total, 0);
        const latestOrder = custOrders[0]?.createdAt || null;
        return {
          ...c,
          orderCount: custOrders.length,
          totalSpend,
          latestOrder,
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [customers, orders]);

  function handleExportInventoryCsv() {
    downloadCsv(
      "bizpilot-inventory-report.csv",
      products.map((p) => ({
        SKU: p.sku,
        Product: p.name,
        Category: p.category,
        Quantity: p.quantity,
        LowStockThreshold: p.lowStockThreshold,
        UnitPrice: p.price,
        InventoryRetailValue: Math.round(p.price * p.quantity * 100) / 100,
      }))
    );
    toast.success("Inventory report exported");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Reports & Analytics
          </h2>
          <p className="text-sm text-slate-500">
            Revenue trends, order conversion statistics, inventory valuation, and customer activity.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 p-1 self-start">
          {(
            [
              { id: "30d", label: "Last 30 Days" },
              { id: "6m", label: "6 Months" },
              { id: "ytd", label: "Year to Date" },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                range === r.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Revenue & Average Order Value</CardTitle>
            <CardDescription>
              Gross revenue bars paired with average order value trend line.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredRevenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    name="Revenue"
                    fill="#1E3A8A"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="averageOrderValue"
                    name="Avg Order Value"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Order Statistics by Status</CardTitle>
            <CardDescription>
              Current distribution across {orders.length} total orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderStatusData} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="status"
                    width={84}
                    tick={{ fontSize: 12, fill: "#334155" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" name="Orders" fill="#2563EB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best-Selling Products & Inventory Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>Best-Selling Products</CardTitle>
            <CardDescription>Ranked by gross order revenue.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bestSellingProducts.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500 font-mono-tabular">
                        {item.sku}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono-tabular">
                      {item.unitsSold}
                    </TableCell>
                    <TableCell className="text-right font-mono-tabular font-semibold text-slate-900">
                      {formatCurrency(item.revenue, settings.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Inventory Valuation Report</CardTitle>
              <CardDescription>
                {inventorySummary.totalUnits} total units ·{" "}
                {formatCurrency(inventorySummary.retailValue, settings.currency)} retail
                value ({formatCurrency(inventorySummary.costValue, settings.currency)} cost)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportInventoryCsv}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.slice(0, 6).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500 font-mono-tabular">
                        {p.sku}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono-tabular">
                      {p.quantity}
                    </TableCell>
                    <TableCell>
                      <StatusIndicator
                        status={
                          p.quantity <= 0
                            ? "Out of Stock"
                            : p.quantity <= p.lowStockThreshold
                            ? "Low Stock"
                            : "In Stock"
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono-tabular font-medium text-slate-900">
                      {formatCurrency(p.price * p.quantity, settings.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Customer Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Activity</CardTitle>
          <CardDescription>
            Customer accounts ranked by cumulative order spend.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerActivity.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.company || c.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusIndicator status={c.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono-tabular">
                    {c.orderCount}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {c.latestOrder ? formatDate(c.latestOrder) : "No orders"}
                  </TableCell>
                  <TableCell className="text-right font-mono-tabular font-semibold text-slate-900">
                    {formatCurrency(c.totalSpend, settings.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
