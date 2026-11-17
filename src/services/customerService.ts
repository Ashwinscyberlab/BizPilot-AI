import { apiRequest } from "@/src/services/apiClient";
import type { Customer, PaginatedResponse } from "@/src/types";
import type { CustomerFormValues } from "@/src/schemas";

export const customerService = {
  async list(params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Customer>> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    const qs = query.toString();
    return apiRequest<PaginatedResponse<Customer>>(
      `/api/v1/customers${qs ? `?${qs}` : ""}`
    );
  },

  async getById(id: string): Promise<Customer> {
    return apiRequest<Customer>(`/api/v1/customers/${id}`);
  },

  async create(payload: CustomerFormValues): Promise<Customer> {
    return apiRequest<Customer>("/api/v1/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: Partial<CustomerFormValues>): Promise<Customer> {
    return apiRequest<Customer>(`/api/v1/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/customers/${id}`, {
      method: "DELETE",
    });
  },
};
