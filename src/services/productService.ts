import { apiRequest } from "@/src/services/apiClient";
import type { PaginatedResponse, Product, StockAdjustment } from "@/src/types";
import type { ProductFormValues, StockAdjustmentFormValues } from "@/src/schemas";

export const productService = {
  async list(params?: {
    search?: string;
    category?: string;
    lowStockOnly?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Product>> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    if (params?.lowStockOnly) query.set("low_stock_only", "true");
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    const qs = query.toString();
    return apiRequest<PaginatedResponse<Product>>(
      `/api/v1/products${qs ? `?${qs}` : ""}`
    );
  },

  async create(payload: ProductFormValues): Promise<Product> {
    return apiRequest<Product>("/api/v1/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: Partial<ProductFormValues>): Promise<Product> {
    return apiRequest<Product>(`/api/v1/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/products/${id}`, {
      method: "DELETE",
    });
  },
};

export const inventoryService = {
  async getAdjustments(productId?: string): Promise<StockAdjustment[]> {
    const qs = productId ? `?product_id=${encodeURIComponent(productId)}` : "";
    return apiRequest<StockAdjustment[]>(`/api/v1/inventory/adjustments${qs}`);
  },

  async adjustStock(payload: StockAdjustmentFormValues): Promise<StockAdjustment> {
    return apiRequest<StockAdjustment>("/api/v1/inventory/adjustments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
