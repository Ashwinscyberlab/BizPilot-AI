import { apiRequest } from "@/src/services/apiClient";
import type { DashboardMetrics, RevenuePoint } from "@/src/types";

export const analyticsService = {
  async getDashboardSummary(): Promise<DashboardMetrics> {
    return apiRequest<DashboardMetrics>("/api/v1/analytics/summary");
  },

  async getRevenueSeries(range: "30d" | "6m" | "ytd" = "6m"): Promise<RevenuePoint[]> {
    return apiRequest<RevenuePoint[]>(`/api/v1/analytics/revenue?range=${range}`);
  },
};
