import { apiRequest } from "@/src/services/apiClient";
import type { Enquiry, EnquiryStatus, PaginatedResponse } from "@/src/types";
import type { EnquiryFormValues } from "@/src/schemas";

export const enquiryService = {
  async list(params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Enquiry>> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    const qs = query.toString();
    return apiRequest<PaginatedResponse<Enquiry>>(
      `/api/v1/enquiries${qs ? `?${qs}` : ""}`
    );
  },

  async create(payload: EnquiryFormValues): Promise<Enquiry> {
    return apiRequest<Enquiry>("/api/v1/enquiries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(id: string, status: EnquiryStatus): Promise<Enquiry> {
    return apiRequest<Enquiry>(`/api/v1/enquiries/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async suggestReply(id: string): Promise<{ draft: string }> {
    return apiRequest<{ draft: string }>(`/api/v1/enquiries/${id}/suggest-reply`, {
      method: "POST",
    });
  },
};
