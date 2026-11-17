import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    businessName: z.string().min(2, "Business name is required"),
    email: z.string().email("Enter a valid work email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter the email associated with your account"),
});

export const customerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(7, "Enter a valid phone number"),
  company: z.string().optional(),
  address: z.string().min(4, "Street address is required"),
  city: z.string().min(2, "City is required"),
  country: z.string().min(2, "Country is required"),
  status: z.enum(["Active", "Inactive"]),
  notes: z.string().optional(),
});

export const enquirySchema = z.object({
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().email("Enter a valid email address"),
  customerPhone: z.string().optional(),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Enquiry message must be at least 10 characters"),
  status: z.enum(["New", "In Progress", "Converted", "Closed"]),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const orderSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  items: z.array(orderItemSchema).min(1, "Add at least one product to the order"),
  notes: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  sku: z.string().min(2, "SKU is required").max(32, "SKU too long"),
  category: z.string().min(2, "Category is required"),
  price: z.number().positive("Selling price must be greater than 0"),
  costPrice: z.number().min(0, "Cost price cannot be negative"),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
  lowStockThreshold: z
    .number()
    .int()
    .min(0, "Low-stock threshold cannot be negative"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  delta: z
    .number()
    .int()
    .refine((val) => val !== 0, "Adjustment cannot be zero"),
  reason: z.enum([
    "Restock",
    "Order Fulfillment",
    "Customer Return",
    "Damaged / Spoilage",
    "Inventory Audit",
  ]),
  note: z.string().optional(),
});

export const businessSettingsSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  businessEmail: z.string().email("Enter a valid business email"),
  phone: z.string().min(7, "Enter a valid phone number"),
  address: z.string().min(4, "Business address is required"),
  city: z.string().min(2, "City is required"),
  country: z.string().min(2, "Country is required"),
  website: z.string().optional(),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD", "INR"]),
  taxRate: z.number().min(0, "Tax rate cannot be negative").max(50, "Tax rate cannot exceed 50%"),
  taxLabel: z.string().min(1, "Tax label is required"),
  invoicePrefix: z.string().min(2, "Prefix must be at least 2 characters").max(10),
  invoicePaymentTermsDays: z.number().int().min(0).max(180),
});

export const accountSettingsSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type CustomerFormValues = z.infer<typeof customerSchema>;
export type EnquiryFormValues = z.infer<typeof enquirySchema>;
export type OrderFormValues = z.infer<typeof orderSchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;
export type BusinessSettingsFormValues = z.infer<typeof businessSettingsSchema>;
export type AccountSettingsFormValues = z.infer<typeof accountSettingsSchema>;
