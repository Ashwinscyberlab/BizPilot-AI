import { apiRequest } from "@/src/services/apiClient";
import type { Order, OrderStatus, PaginatedResponse } from "@/src/types";
import type { OrderFormValues } from "@/src/schemas";

export const orderService = {
  async list(params?: {
    search?: string;
    status?: string;
    customerId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Order>> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.customerId) query.set("customer_id", params.customerId);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    const qs = query.toString();
    return apiRequest<PaginatedResponse<Order>>(
      `/api/v1/orders${qs ? `?${qs}` : ""}`
    );
  },

  async getById(id: string): Promise<Order> {
    return apiRequest<Order>(`/api/v1/orders/${id}`);
  },

  async create(payload: OrderFormValues): Promise<Order> {
    return apiRequest<Order>("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return apiRequest<Order>(`/api/v1/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
