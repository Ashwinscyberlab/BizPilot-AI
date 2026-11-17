import { apiRequest } from "@/src/services/apiClient";
import type { Invoice, InvoiceStatus, PaginatedResponse } from "@/src/types";

export const invoiceService = {
  async list(params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Invoice>> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    const qs = query.toString();
    return apiRequest<PaginatedResponse<Invoice>>(
      `/api/v1/invoices${qs ? `?${qs}` : ""}`
    );
  },

  async generateFromOrder(orderId: string): Promise<Invoice> {
    return apiRequest<Invoice>("/api/v1/invoices/from-order", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    });
  },

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    return apiRequest<Invoice>(`/api/v1/invoices/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
