import { apiRequest } from "@/src/services/apiClient";
import type { ConnectionMode } from "@/src/types";

export interface ChatRequest {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  businessContext: Record<string, unknown>;
  mode: ConnectionMode;
}

export interface DraftReplyRequest {
  customerName: string;
  customerEmail: string;
  enquiryMessage: string;
  status: string;
  businessName: string;
  tone?: string;
  enquiryId?: string;
  mode: ConnectionMode;
}

export const aiService = {
  async sendMessage(payload: ChatRequest): Promise<{ reply: string }> {
    if (payload.mode === "fastapi") {
      return apiRequest<{ reply: string }>("/api/v1/ai/chat", {
        method: "POST",
        timeoutMs: 25000,
        body: JSON.stringify({
          message: payload.message,
          history: payload.history,
          business_context: payload.businessContext,
        }),
      });
    }

    // In development workspace mode, route to server-side Gemini endpoint (/api/ai/chat)
    return apiRequest<{ reply: string }>("/api/ai/chat", {
      baseUrlOverride: "",
      timeoutMs: 25000,
      method: "POST",
      body: JSON.stringify({
        message: payload.message,
        history: payload.history,
        businessContext: payload.businessContext,
      }),
    });
  },

  async draftEnquiryReply(payload: DraftReplyRequest): Promise<{ draft: string }> {
    if (payload.mode === "fastapi" && payload.enquiryId) {
      return apiRequest<{ draft: string }>(
        `/api/v1/enquiries/${payload.enquiryId}/suggest-reply`,
        {
          method: "POST",
          timeoutMs: 25000,
          body: JSON.stringify({ tone: payload.tone || "professional" }),
        }
      );
    }

    return apiRequest<{ draft: string }>("/api/ai/draft-reply", {
      baseUrlOverride: "",
      timeoutMs: 25000,
      method: "POST",
      body: JSON.stringify({
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        enquiryMessage: payload.enquiryMessage,
        status: payload.status,
        businessName: payload.businessName,
        tone: payload.tone || "professional",
      }),
    });
  },
};
