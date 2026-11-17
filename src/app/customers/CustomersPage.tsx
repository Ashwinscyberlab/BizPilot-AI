import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Eye, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useDataStore } from "@/src/hooks/useDataStore";
import { customerSchema, type CustomerFormValues } from "@/src/schemas";
import { formatCurrency, formatDate } from "@/src/lib/utils";
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
import type { Customer } from "@/src/types";

const PAGE_SIZE = 6;

export function CustomersPage() {
  const { customers, orders, settings, createCustomer, updateCustomer, deleteCustomer } =
    useDataStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      country: "United States",
      status: "Active",
      notes: "",
    },
  });

  const statusValue = watch("status");

  const customerOrderStats = useMemo(() => {
    const map = new Map<string, { count: number; spent: number }>();
    for (const o of orders) {
      if (o.status === "Cancelled") continue;
      const cur = map.get(o.customerId) || { count: 0, spent: 0 };
      cur.count += 1;
      cur.spent += o.total;
      map.set(o.customerId, cur);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [customers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openCreateDialog() {
    setEditingCustomer(null);
    reset({
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      country: "United States",
      status: "Active",
      notes: "",
    });
    setFormOpen(true);
  }

  function openEditDialog(customer: Customer) {
    setEditingCustomer(customer);
    reset({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company || "",
      address: customer.address,
      city: customer.city,
      country: customer.country,
      status: customer.status,
      notes: customer.notes || "",
    });
    setFormOpen(true);
  }

  async function onSubmit(values: CustomerFormValues) {
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, values);
        toast.success("Customer updated");
      } else {
        await createCustomer(values);
        toast.success("Customer added");
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save customer");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCustomer(deleteTarget.id);
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete customer");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Customers
          </h2>
          <p className="text-sm text-slate-500">
            Manage customer contacts, billing addresses, and order history.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Filters Toolbar */}
      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search name, email, company..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 p-1 self-start sm:self-auto">
            {(["All", "Active", "Inactive"] as const).map((st) => (
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
              icon={Users}
              title="No matching customers"
              description="Try adjusting your search query or add a new customer record."
              actionLabel="Add Customer"
              onAction={openCreateDialog}
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((customer) => {
                  const stats = customerOrderStats.get(customer.id) || {
                    count: 0,
                    spent: 0,
                  };
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-medium text-slate-900 group-hover:text-blue-700">
                            {customer.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {customer.company || `Joined ${formatDate(customer.createdAt)}`}
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-800">{customer.email}</div>
                        <div className="text-xs text-slate-500 font-mono-tabular">
                          {customer.phone}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {customer.city}, {customer.country}
                      </TableCell>
                      <TableCell>
                        <StatusIndicator status={customer.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono-tabular">
                        {stats.count}
                      </TableCell>
                      <TableCell className="text-right font-mono-tabular font-medium text-slate-900">
                        {formatCurrency(stats.spent, settings.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            title="View profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(customer)}
                            title="Edit customer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(customer)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete customer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      {/* Add/Edit Customer Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
            <DialogDescription>
              Store verified billing and shipping details for orders and invoices.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Full Name</Label>
                <Input id="cust-name" {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-company">Company (Optional)</Label>
                <Input id="cust-company" {...register("company")} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-email">Email</Label>
                <Input id="cust-email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone">Phone</Label>
                <Input id="cust-phone" {...register("phone")} />
                {errors.phone && (
                  <p className="text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-address">Street Address</Label>
              <Input id="cust-address" {...register("address")} />
              {errors.address && (
                <p className="text-xs text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-city">City</Label>
                <Input id="cust-city" {...register("city")} />
                {errors.city && (
                  <p className="text-xs text-red-600">{errors.city.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-country">Country</Label>
                <Input id="cust-country" {...register("country")} />
                {errors.country && (
                  <p className="text-xs text-red-600">{errors.country.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={statusValue}
                  onValueChange={(v) => setValue("status", v as "Active" | "Inactive")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-notes">Internal Notes</Label>
              <Textarea id="cust-notes" rows={2} {...register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingCustomer
                  ? "Save Changes"
                  : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget?.name}
              </span>
              ? Existing historical orders will remain archived.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
