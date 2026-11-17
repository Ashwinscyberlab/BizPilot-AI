export type UserRole = "owner" | "manager" | "staff";

export interface User {
  id: string;
  fullName: string;
  email: string;
  businessName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  businessName: string;
  email: string;
  password: string;
}

export type CustomerStatus = "Active" | "Inactive";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  city: string;
  country: string;
  status: CustomerStatus;
  notes?: string;
  createdAt: string;
}

export type EnquiryStatus = "New" | "In Progress" | "Converted" | "Closed";

export interface Enquiry {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  subject: string;
  message: string;
  status: EnquiryStatus;
  aiDraftReply?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  quantity: number;
  lowStockThreshold: number;
  description?: string;
  imageUrl?: string;
  updatedAt: string;
}

export type StockAdjustmentReason =
  | "Restock"
  | "Order Fulfillment"
  | "Customer Return"
  | "Damaged / Spoilage"
  | "Inventory Audit";

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  delta: number;
  previousQuantity: number;
  newQuantity: number;
  reason: StockAdjustmentReason;
  note?: string;
  performedBy: string;
  createdAt: string;
}

export type InvoiceStatus = "Paid" | "Unpaid" | "Overdue";

export interface InvoiceItem {
  description: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
}

export interface BusinessSettings {
  businessName: string;
  businessEmail: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website?: string;
  currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "INR";
  taxRate: number;
  taxLabel: string;
  invoicePrefix: string;
  invoicePaymentTermsDays: number;
}

export interface RevenuePoint {
  period: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface DashboardMetrics {
  totalRevenue: number;
  revenueGrowthPct: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  lowStockCount: number;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ConnectionMode = "fastapi" | "dev_demo";
