import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEV_BUSINESS_SETTINGS,
  DEV_CUSTOMERS,
  DEV_ENQUIRIES,
  DEV_HISTORICAL_REVENUE,
  DEV_INVOICES,
  DEV_ORDERS,
  DEV_OWNER_USER,
  DEV_PRODUCTS,
  DEV_STOCK_ADJUSTMENTS,
} from "@/src/lib/devSeed";
import { generateId } from "@/src/lib/utils";
import type {
  AccountSettingsFormValues,
  BusinessSettingsFormValues,
  CustomerFormValues,
  EnquiryFormValues,
  OrderFormValues,
  ProductFormValues,
  StockAdjustmentFormValues,
} from "@/src/schemas";
import {
  aiService,
  authService,
  customerService,
  enquiryService,
  inventoryService,
  invoiceService,
  orderService,
  productService,
  setAuthToken,
  settingsService,
} from "@/src/services";
import type {
  AIMessage,
  BusinessSettings,
  ConnectionMode,
  Customer,
  DashboardMetrics,
  Enquiry,
  EnquiryStatus,
  Invoice,
  InvoiceStatus,
  LoginCredentials,
  Order,
  OrderStatus,
  Product,
  RegisterPayload,
  RevenuePoint,
  StockAdjustment,
  User,
} from "@/src/types";

const SESSION_MODE_KEY = "bizpilot_session_mode";
const DEV_STATE_KEY = "bizpilot_dev_workspace_v1";

interface DevWorkspaceSnapshot {
  user: User;
  settings: BusinessSettings;
  customers: Customer[];
  enquiries: Enquiry[];
  orders: Order[];
  products: Product[];
  adjustments: StockAdjustment[];
  invoices: Invoice[];
  aiHistory: AIMessage[];
}

function loadDevSnapshot(): DevWorkspaceSnapshot {
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(DEV_STATE_KEY);
      if (raw) {
        return JSON.parse(raw) as DevWorkspaceSnapshot;
      }
    } catch {
      // ignore corrupted dev storage
    }
  }
  return {
    user: DEV_OWNER_USER,
    settings: DEV_BUSINESS_SETTINGS,
    customers: DEV_CUSTOMERS,
    enquiries: DEV_ENQUIRIES,
    orders: DEV_ORDERS,
    products: DEV_PRODUCTS,
    adjustments: DEV_STOCK_ADJUSTMENTS,
    invoices: DEV_INVOICES,
    aiHistory: [],
  };
}

interface DataStoreContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isRefreshing: boolean;
  dataError: string | null;
  connectionMode: ConnectionMode;

  settings: BusinessSettings;
  customers: Customer[];
  enquiries: Enquiry[];
  orders: Order[];
  products: Product[];
  adjustments: StockAdjustment[];
  invoices: Invoice[];
  aiHistory: AIMessage[];

  dashboardMetrics: DashboardMetrics;
  revenueSeries: RevenuePoint[];
  bestSellingProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    unitsSold: number;
    revenue: number;
  }>;

  // Auth actions
  loginWithBackend: (creds: LoginCredentials) => Promise<void>;
  registerWithBackend: (payload: RegisterPayload) => Promise<void>;
  enterDevDemo: () => void;
  logout: () => Promise<void>;
  resetDevWorkspace: () => void;
  refreshAll: () => Promise<void>;

  // Customers
  createCustomer: (payload: CustomerFormValues) => Promise<Customer>;
  updateCustomer: (id: string, payload: CustomerFormValues) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  // Enquiries
  createEnquiry: (payload: EnquiryFormValues) => Promise<Enquiry>;
  updateEnquiryStatus: (id: string, status: EnquiryStatus) => Promise<Enquiry>;
  suggestEnquiryReply: (enquiryId: string, tone?: string) => Promise<string>;

  // Orders
  createOrder: (payload: OrderFormValues) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<Order>;

  // Products & Inventory
  createProduct: (payload: ProductFormValues) => Promise<Product>;
  updateProduct: (id: string, payload: ProductFormValues) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (payload: StockAdjustmentFormValues) => Promise<StockAdjustment>;

  // Invoices
  generateInvoiceFromOrder: (orderId: string) => Promise<Invoice>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<Invoice>;

  // Settings
  updateBusinessSettings: (
    payload: BusinessSettingsFormValues
  ) => Promise<BusinessSettings>;
  updateAccountSettings: (payload: AccountSettingsFormValues) => Promise<User>;

  // AI Assistant
  sendAiMessage: (prompt: string) => Promise<AIMessage>;
  clearAiHistory: () => void;
}

const DataStoreContext = createContext<DataStoreContextValue | undefined>(undefined);

export function DataStoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("dev_demo");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [settings, setSettings] = useState<BusinessSettings>(DEV_BUSINESS_SETTINGS);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [aiHistory, setAiHistory] = useState<AIMessage[]>([]);

  // Persist dev workspace changes during session
  useEffect(() => {
    if (connectionMode === "dev_demo" && user && typeof window !== "undefined") {
      const snapshot: DevWorkspaceSnapshot = {
        user,
        settings,
        customers,
        enquiries,
        orders,
        products,
        adjustments,
        invoices,
        aiHistory,
      };
      window.sessionStorage.setItem(DEV_STATE_KEY, JSON.stringify(snapshot));
    }
  }, [
    connectionMode,
    user,
    settings,
    customers,
    enquiries,
    orders,
    products,
    adjustments,
    invoices,
    aiHistory,
  ]);

  const hydrateFromBackend = useCallback(async () => {
    setIsRefreshing(true);
    setDataError(null);
    try {
      const [custRes, enqRes, ordRes, prodRes, adjRes, invRes, setRes] =
        await Promise.all([
          customerService.list({ page: 1, pageSize: 100 }),
          enquiryService.list({ page: 1, pageSize: 100 }),
          orderService.list({ page: 1, pageSize: 100 }),
          productService.list({ page: 1, pageSize: 100 }),
          inventoryService.getAdjustments(),
          invoiceService.list({ page: 1, pageSize: 100 }),
          settingsService.getSettings(),
        ]);

      setCustomers(custRes.items);
      setEnquiries(enqRes.items);
      setOrders(ordRes.items);
      setProducts(prodRes.items);
      setAdjustments(adjRes);
      setInvoices(invRes.items);
      setSettings(setRes);
    } catch (err) {
      setDataError(
        err instanceof Error
          ? err.message
          : "Unable to load workspace data from FastAPI backend."
      );
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const applyDevSnapshot = useCallback((snap: DevWorkspaceSnapshot) => {
    setUser(snap.user);
    setSettings(snap.settings);
    setCustomers(snap.customers);
    setEnquiries(snap.enquiries);
    setOrders(snap.orders);
    setProducts(snap.products);
    setAdjustments(snap.adjustments);
    setInvoices(snap.invoices);
    setAiHistory(snap.aiHistory);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const mode =
        typeof window !== "undefined"
          ? (window.localStorage.getItem(SESSION_MODE_KEY) as ConnectionMode | null)
          : null;

      if (mode === "fastapi") {
        try {
          const currentUser = await authService.getCurrentUser();
          setConnectionMode("fastapi");
          setUser(currentUser);
          await hydrateFromBackend();
        } catch {
          setAuthToken(null);
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(SESSION_MODE_KEY);
          }
          setUser(null);
        }
      } else if (mode === "dev_demo") {
        setConnectionMode("dev_demo");
        applyDevSnapshot(loadDevSnapshot());
      }
      setIsInitializing(false);
    }

    bootstrap();
  }, [applyDevSnapshot, hydrateFromBackend]);

  const loginWithBackend = useCallback(
    async (creds: LoginCredentials) => {
      const { user: loggedInUser } = await authService.login(creds);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SESSION_MODE_KEY, "fastapi");
      }
      setConnectionMode("fastapi");
      setUser(loggedInUser);
      await hydrateFromBackend();
    },
    [hydrateFromBackend]
  );

  const registerWithBackend = useCallback(
    async (payload: RegisterPayload) => {
      const { user: newUser } = await authService.register(payload);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SESSION_MODE_KEY, "fastapi");
      }
      setConnectionMode("fastapi");
      setUser(newUser);
      await hydrateFromBackend();
    },
    [hydrateFromBackend]
  );

  const enterDevDemo = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_MODE_KEY, "dev_demo");
    }
    setConnectionMode("dev_demo");
    setDataError(null);
    applyDevSnapshot(loadDevSnapshot());
  }, [applyDevSnapshot]);

  const logout = useCallback(async () => {
    if (connectionMode === "fastapi") {
      await authService.logout();
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_MODE_KEY);
    }
    setUser(null);
  }, [connectionMode]);

  const resetDevWorkspace = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(DEV_STATE_KEY);
    }
    applyDevSnapshot({
      user: DEV_OWNER_USER,
      settings: DEV_BUSINESS_SETTINGS,
      customers: DEV_CUSTOMERS,
      enquiries: DEV_ENQUIRIES,
      orders: DEV_ORDERS,
      products: DEV_PRODUCTS,
      adjustments: DEV_STOCK_ADJUSTMENTS,
      invoices: DEV_INVOICES,
      aiHistory: [],
    });
  }, [applyDevSnapshot]);

  const refreshAll = useCallback(async () => {
    if (connectionMode === "fastapi") {
      await hydrateFromBackend();
    } else {
      setIsRefreshing(true);
      await new Promise((r) => setTimeout(r, 250));
      setIsRefreshing(false);
    }
  }, [connectionMode, hydrateFromBackend]);

  // Derived analytics
  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status !== "Cancelled");
    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = orders.filter(
      (o) => o.status === "Pending" || o.status === "Processing"
    ).length;
    const lowStockCount = products.filter(
      (p) => p.quantity <= p.lowStockThreshold
    ).length;

    return {
      totalRevenue,
      revenueGrowthPct: 14.2,
      totalOrders: orders.length,
      pendingOrders,
      totalCustomers: customers.length,
      lowStockCount,
    };
  }, [orders, products, customers]);

  const revenueSeries: RevenuePoint[] = useMemo(() => {
    const novOrders = orders.filter(
      (o) => o.status !== "Cancelled" && o.createdAt.startsWith("2026-11")
    );
    const novRevenue = novOrders.reduce((s, o) => s + o.total, 0);
    const novPoint: RevenuePoint = {
      period: "Nov",
      revenue: Math.round(novRevenue * 100) / 100,
      orders: novOrders.length,
      averageOrderValue:
        novOrders.length > 0 ? Math.round(novRevenue / novOrders.length) : 0,
    };
    return [...DEV_HISTORICAL_REVENUE, novPoint];
  }, [orders]);

  const bestSellingProducts = useMemo(() => {
    const map = new Map<
      string,
      { productId: string; name: string; sku: string; unitsSold: number; revenue: number }
    >();
    for (const order of orders) {
      if (order.status === "Cancelled") continue;
      for (const item of order.items) {
        const existing = map.get(item.productId) || {
          productId: item.productId,
          name: item.productName,
          sku: item.sku,
          unitsSold: 0,
          revenue: 0,
        };
        existing.unitsSold += item.quantity;
        existing.revenue += item.lineTotal;
        map.set(item.productId, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  // Customer CRUD
  const createCustomer = useCallback(
    async (payload: CustomerFormValues): Promise<Customer> => {
      if (connectionMode === "fastapi") {
        const created = await customerService.create(payload);
        setCustomers((prev) => [created, ...prev]);
        return created;
      }
      const created: Customer = {
        id: generateId("cust"),
        ...payload,
        createdAt: new Date().toISOString(),
      };
      setCustomers((prev) => [created, ...prev]);
      return created;
    },
    [connectionMode]
  );

  const updateCustomer = useCallback(
    async (id: string, payload: CustomerFormValues): Promise<Customer> => {
      if (connectionMode === "fastapi") {
        const updated = await customerService.update(id, payload);
        setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
        return updated;
      }
      let updatedItem: Customer | undefined;
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          updatedItem = { ...c, ...payload };
          return updatedItem;
        })
      );
      if (!updatedItem) throw new Error("Customer not found");
      return updatedItem;
    },
    [connectionMode]
  );

  const deleteCustomer = useCallback(
    async (id: string): Promise<void> => {
      if (connectionMode === "fastapi") {
        await customerService.remove(id);
      }
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    },
    [connectionMode]
  );

  // Enquiry actions
  const createEnquiry = useCallback(
    async (payload: EnquiryFormValues): Promise<Enquiry> => {
      if (connectionMode === "fastapi") {
        const created = await enquiryService.create(payload);
        setEnquiries((prev) => [created, ...prev]);
        return created;
      }
      const now = new Date().toISOString();
      const created: Enquiry = {
        id: generateId("enq"),
        ...payload,
        createdAt: now,
        updatedAt: now,
      };
      setEnquiries((prev) => [created, ...prev]);
      return created;
    },
    [connectionMode]
  );

  const updateEnquiryStatus = useCallback(
    async (id: string, status: EnquiryStatus): Promise<Enquiry> => {
      if (connectionMode === "fastapi") {
        const updated = await enquiryService.updateStatus(id, status);
        setEnquiries((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
      }
      let updatedItem: Enquiry | undefined;
      setEnquiries((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          updatedItem = { ...e, status, updatedAt: new Date().toISOString() };
          return updatedItem;
        })
      );
      if (!updatedItem) throw new Error("Enquiry not found");
      return updatedItem;
    },
    [connectionMode]
  );

  const suggestEnquiryReply = useCallback(
    async (enquiryId: string, tone = "professional"): Promise<string> => {
      const target = enquiries.find((e) => e.id === enquiryId);
      if (!target) throw new Error("Enquiry not found");

      const { draft } = await aiService.draftEnquiryReply({
        enquiryId,
        customerName: target.customerName,
        customerEmail: target.customerEmail,
        enquiryMessage: target.message,
        status: target.status,
        businessName: settings.businessName,
        tone,
        mode: connectionMode,
      });

      setEnquiries((prev) =>
        prev.map((e) => (e.id === enquiryId ? { ...e, aiDraftReply: draft } : e))
      );
      return draft;
    },
    [enquiries, settings.businessName, connectionMode]
  );

  // Order actions
  const createOrder = useCallback(
    async (payload: OrderFormValues): Promise<Order> => {
      if (connectionMode === "fastapi") {
        const created = await orderService.create(payload);
        await hydrateFromBackend();
        return created;
      }

      const customer = customers.find((c) => c.id === payload.customerId);
      if (!customer) throw new Error("Selected customer not found");

      const orderItems = payload.items.map((line) => {
        const product = products.find((p) => p.id === line.productId);
        if (!product) throw new Error("Selected product not found");
        if (product.quantity < line.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name} (${product.quantity} available)`
          );
        }
        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: line.quantity,
          unitPrice: product.price,
          lineTotal: Math.round(product.price * line.quantity * 100) / 100,
        };
      });

      const subtotal =
        Math.round(orderItems.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
      const taxAmount =
        Math.round(subtotal * (settings.taxRate / 100) * 100) / 100;
      const total = Math.round((subtotal + taxAmount) * 100) / 100;
      const now = new Date().toISOString();
      const nextNum = 1001 + orders.length;

      const created: Order = {
        id: generateId("ord"),
        orderNumber: `ORD-2026-${nextNum}`,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        items: orderItems,
        subtotal,
        taxRate: settings.taxRate,
        taxAmount,
        total,
        status: "Pending",
        notes: payload.notes,
        createdAt: now,
        updatedAt: now,
      };

      // Deduct product quantities and record stock adjustments
      const newAdjustments: StockAdjustment[] = [];
      setProducts((prev) =>
        prev.map((prod) => {
          const orderedLine = orderItems.find((i) => i.productId === prod.id);
          if (!orderedLine) return prod;
          const newQty = Math.max(0, prod.quantity - orderedLine.quantity);
          newAdjustments.push({
            id: generateId("adj"),
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            delta: -orderedLine.quantity,
            previousQuantity: prod.quantity,
            newQuantity: newQty,
            reason: "Order Fulfillment",
            note: `Allocated to ${created.orderNumber}`,
            performedBy: user?.fullName || "Owner",
            createdAt: now,
          });
          return { ...prod, quantity: newQty, updatedAt: now };
        })
      );

      setAdjustments((prev) => [...newAdjustments, ...prev]);
      setOrders((prev) => [created, ...prev]);
      return created;
    },
    [
      connectionMode,
      hydrateFromBackend,
      customers,
      products,
      settings.taxRate,
      orders.length,
      user?.fullName,
    ]
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus): Promise<Order> => {
      if (connectionMode === "fastapi") {
        const updated = await orderService.updateStatus(id, status);
        setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
        return updated;
      }
      let updatedItem: Order | undefined;
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          updatedItem = { ...o, status, updatedAt: new Date().toISOString() };
          return updatedItem;
        })
      );
      if (!updatedItem) throw new Error("Order not found");
      return updatedItem;
    },
    [connectionMode]
  );

  // Products & Inventory
  const createProduct = useCallback(
    async (payload: ProductFormValues): Promise<Product> => {
      if (connectionMode === "fastapi") {
        const created = await productService.create(payload);
        setProducts((prev) => [created, ...prev]);
        return created;
      }
      const created: Product = {
        id: generateId("prod"),
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      setProducts((prev) => [created, ...prev]);
      return created;
    },
    [connectionMode]
  );

  const updateProduct = useCallback(
    async (id: string, payload: ProductFormValues): Promise<Product> => {
      if (connectionMode === "fastapi") {
        const updated = await productService.update(id, payload);
        setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
        return updated;
      }
      let updatedItem: Product | undefined;
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          updatedItem = { ...p, ...payload, updatedAt: new Date().toISOString() };
          return updatedItem;
        })
      );
      if (!updatedItem) throw new Error("Product not found");
      return updatedItem;
    },
    [connectionMode]
  );

  const deleteProduct = useCallback(
    async (id: string): Promise<void> => {
      if (connectionMode === "fastapi") {
        await productService.remove(id);
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
    },
    [connectionMode]
  );

  const adjustStock = useCallback(
    async (payload: StockAdjustmentFormValues): Promise<StockAdjustment> => {
      if (connectionMode === "fastapi") {
        const adj = await inventoryService.adjustStock(payload);
        await hydrateFromBackend();
        return adj;
      }
      const prod = products.find((p) => p.id === payload.productId);
      if (!prod) throw new Error("Product not found");

      const newQuantity = prod.quantity + payload.delta;
      if (newQuantity < 0) {
        throw new Error(
          `Cannot reduce stock below 0 (current stock: ${prod.quantity})`
        );
      }

      const now = new Date().toISOString();
      const adj: StockAdjustment = {
        id: generateId("adj"),
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        delta: payload.delta,
        previousQuantity: prod.quantity,
        newQuantity,
        reason: payload.reason,
        note: payload.note,
        performedBy: user?.fullName || "Owner",
        createdAt: now,
      };

      setProducts((prev) =>
        prev.map((p) =>
          p.id === prod.id ? { ...p, quantity: newQuantity, updatedAt: now } : p
        )
      );
      setAdjustments((prev) => [adj, ...prev]);
      return adj;
    },
    [connectionMode, hydrateFromBackend, products, user?.fullName]
  );

  // Invoices
  const generateInvoiceFromOrder = useCallback(
    async (orderId: string): Promise<Invoice> => {
      if (connectionMode === "fastapi") {
        const created = await invoiceService.generateFromOrder(orderId);
        setInvoices((prev) => [created, ...prev]);
        return created;
      }
      const existing = invoices.find((inv) => inv.orderId === orderId);
      if (existing) {
        return existing;
      }
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new Error("Order not found");
      const customer = customers.find((c) => c.id === order.customerId);

      const issued = new Date();
      const due = new Date(
        issued.getTime() + settings.invoicePaymentTermsDays * 86400000
      );
      const seq = 419 + invoices.length;

      const created: Invoice = {
        id: generateId("inv"),
        invoiceNumber: `${settings.invoicePrefix}-2026-0${seq}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerAddress: customer
          ? `${customer.address}, ${customer.city}, ${customer.country}`
          : "Address on file",
        items: order.items.map((item) => ({
          description: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.lineTotal,
        })),
        subtotal: order.subtotal,
        taxRate: order.taxRate,
        taxAmount: order.taxAmount,
        total: order.total,
        status: "Unpaid",
        issuedAt: issued.toISOString(),
        dueAt: due.toISOString(),
      };

      setInvoices((prev) => [created, ...prev]);
      return created;
    },
    [connectionMode, invoices, orders, customers, settings]
  );

  const updateInvoiceStatus = useCallback(
    async (id: string, status: InvoiceStatus): Promise<Invoice> => {
      if (connectionMode === "fastapi") {
        const updated = await invoiceService.updateStatus(id, status);
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
        return updated;
      }
      let updatedItem: Invoice | undefined;
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== id) return inv;
          updatedItem = {
            ...inv,
            status,
            paidAt: status === "Paid" ? new Date().toISOString() : undefined,
          };
          return updatedItem;
        })
      );
      if (!updatedItem) throw new Error("Invoice not found");
      return updatedItem;
    },
    [connectionMode]
  );

  // Settings
  const updateBusinessSettings = useCallback(
    async (payload: BusinessSettingsFormValues): Promise<BusinessSettings> => {
      if (connectionMode === "fastapi") {
        const updated = await settingsService.updateBusinessSettings(payload);
        setSettings(updated);
        return updated;
      }
      setSettings(payload);
      return payload;
    },
    [connectionMode]
  );

  const updateAccountSettings = useCallback(
    async (payload: AccountSettingsFormValues): Promise<User> => {
      if (connectionMode === "fastapi") {
        const updated = await settingsService.updateAccountSettings(payload);
        setUser(updated);
        return updated;
      }
      if (!user) throw new Error("Not authenticated");
      const updated: User = { ...user, ...payload };
      setUser(updated);
      return updated;
    },
    [connectionMode, user]
  );

  // AI Assistant
  const sendAiMessage = useCallback(
    async (prompt: string): Promise<AIMessage> => {
      const userMsg: AIMessage = {
        id: generateId("msg"),
        role: "user",
        content: prompt,
        createdAt: new Date().toISOString(),
      };
      setAiHistory((prev) => [...prev, userMsg]);

      const nowMonthPrefix = "2026-11";
      const monthlyRevenue = orders
        .filter((o) => o.status !== "Cancelled" && o.createdAt.startsWith(nowMonthPrefix))
        .reduce((s, o) => s + o.total, 0);

      const businessContext = {
        businessName: settings.businessName,
        currency: settings.currency,
        currentDate: "2026-11-17",
        summary: {
          totalRevenueAllOrders: dashboardMetrics.totalRevenue,
          novemberMonthToDateRevenue: Math.round(monthlyRevenue * 100) / 100,
          totalOrders: dashboardMetrics.totalOrders,
          pendingOrProcessingOrders: dashboardMetrics.pendingOrders,
          totalCustomers: dashboardMetrics.totalCustomers,
          lowStockProductCount: dashboardMetrics.lowStockCount,
        },
        lowStockProducts: products
          .filter((p) => p.quantity <= p.lowStockThreshold)
          .map((p) => ({
            name: p.name,
            sku: p.sku,
            quantityRemaining: p.quantity,
            reorderThreshold: p.lowStockThreshold,
          })),
        bestSellingProducts: bestSellingProducts.slice(0, 5),
        pendingOrdersList: orders
          .filter((o) => o.status === "Pending" || o.status === "Processing")
          .map((o) => ({
            orderNumber: o.orderNumber,
            customer: o.customerName,
            status: o.status,
            total: o.total,
            createdAt: o.createdAt,
          })),
        openEnquiries: enquiries
          .filter((e) => e.status === "New" || e.status === "In Progress")
          .map((e) => ({
            customerName: e.customerName,
            subject: e.subject,
            message: e.message,
            status: e.status,
          })),
        unpaidOrOverdueInvoices: invoices
          .filter((i) => i.status !== "Paid")
          .map((i) => ({
            invoiceNumber: i.invoiceNumber,
            customer: i.customerName,
            total: i.total,
            status: i.status,
            dueAt: i.dueAt,
          })),
      };

      try {
        const { reply } = await aiService.sendMessage({
          message: prompt,
          history: aiHistory.map((m) => ({ role: m.role, content: m.content })),
          businessContext,
          mode: connectionMode,
        });

        const assistantMsg: AIMessage = {
          id: generateId("msg"),
          role: "assistant",
          content: reply,
          createdAt: new Date().toISOString(),
        };
        setAiHistory((prev) => [...prev, assistantMsg]);
        return assistantMsg;
      } catch (err) {
        const errorText =
          err instanceof Error ? err.message : "AI request failed.";
        const errorMsg: AIMessage = {
          id: generateId("msg"),
          role: "assistant",
          content: errorText,
          error: errorText,
          createdAt: new Date().toISOString(),
        };
        setAiHistory((prev) => [...prev, errorMsg]);
        throw err;
      }
    },
    [
      aiHistory,
      bestSellingProducts,
      connectionMode,
      dashboardMetrics,
      enquiries,
      invoices,
      orders,
      products,
      settings.businessName,
      settings.currency,
    ]
  );

  const clearAiHistory = useCallback(() => {
    setAiHistory([]);
  }, []);

  const value: DataStoreContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isInitializing,
    isRefreshing,
    dataError,
    connectionMode,
    settings,
    customers,
    enquiries,
    orders,
    products,
    adjustments,
    invoices,
    aiHistory,
    dashboardMetrics,
    revenueSeries,
    bestSellingProducts,
    loginWithBackend,
    registerWithBackend,
    enterDevDemo,
    logout,
    resetDevWorkspace,
    refreshAll,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    createEnquiry,
    updateEnquiryStatus,
    suggestEnquiryReply,
    createOrder,
    updateOrderStatus,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    generateInvoiceFromOrder,
    updateInvoiceStatus,
    updateBusinessSettings,
    updateAccountSettings,
    sendAiMessage,
    clearAiHistory,
  };

  return (
    <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>
  );
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) {
    throw new Error("useDataStore must be used inside DataStoreProvider");
  }
  return ctx;
}
