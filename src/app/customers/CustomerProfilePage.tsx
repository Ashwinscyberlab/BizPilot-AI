import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShoppingCart,
} from "lucide-react";
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
import { EmptyState } from "@/src/components/ui/empty-state";
import { StatusIndicator } from "@/src/components/ui/status-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

export function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, orders, settings } = useDataStore();

  const customer = customers.find((c) => c.id === id);

  const customerOrders = useMemo(
    () => orders.filter((o) => o.customerId === id),
    [orders, id]
  );

  const totalSpent = useMemo(
    () =>
      customerOrders
        .filter((o) => o.status !== "Cancelled")
        .reduce((sum, o) => sum + o.total, 0),
    [customerOrders]
  );

  if (!customer) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/customers">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
        <EmptyState
          icon={Building2}
          title="Customer not found"
          description="This customer profile may have been deleted or does not exist."
          actionLabel="Return to Directory"
          onAction={() => navigate("/customers")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/customers">
              <ArrowLeft className="h-4 w-4" />
              Customers
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {customer.name}
            </h2>
            <p className="text-xs text-slate-500">
              {customer.company || "Individual Account"} · Customer since{" "}
              {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/orders?new=1&customerId=${customer.id}`)}
        >
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Contact Details */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contact Information</CardTitle>
            <StatusIndicator status={customer.status} />
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Email</div>
                <div className="font-medium text-slate-900">{customer.email}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Phone</div>
                <div className="font-medium text-slate-900 font-mono-tabular">
                  {customer.phone}
                </div>
              </div>
            </div>

            {customer.company && (
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500">Company</div>
                  <div className="font-medium text-slate-900">{customer.company}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Billing / Shipping Address</div>
                <div className="font-medium text-slate-900">
                  {customer.address}
                  <br />
                  {customer.city}, {customer.country}
                </div>
              </div>
            </div>

            {customer.notes && (
              <div className="border-t border-slate-100 pt-3">
                <div className="text-xs text-slate-500">Notes</div>
                <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                  {customer.notes}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <div className="text-xs text-slate-500">Total Orders</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
                  {customerOrders.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Lifetime Spend</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 font-mono-tabular">
                  {formatCurrency(totalSpent, settings.currency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order History */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Customer Order History</CardTitle>
            <CardDescription>
              All orders placed by {customer.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {customerOrders.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={ShoppingCart}
                  title="No orders yet"
                  description="This customer has not placed any orders yet."
                  actionLabel="Create First Order"
                  onAction={() =>
                    navigate(`/orders?new=1&customerId=${customer.id}`)
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      onClick={() => navigate(`/orders?order=${order.id}`)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-mono-tabular font-semibold text-slate-900">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} units (
                        {order.items.length}{" "}
                        {order.items.length === 1 ? "line" : "lines"})
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
      </div>
    </div>
  );
}
