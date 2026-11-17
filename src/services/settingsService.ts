import { apiRequest } from "@/src/services/apiClient";
import type { BusinessSettings, User } from "@/src/types";
import type { AccountSettingsFormValues, BusinessSettingsFormValues } from "@/src/schemas";

export const settingsService = {
  async getSettings(): Promise<BusinessSettings> {
    return apiRequest<BusinessSettings>("/api/v1/settings/business");
  },

  async updateBusinessSettings(
    payload: BusinessSettingsFormValues
  ): Promise<BusinessSettings> {
    return apiRequest<BusinessSettings>("/api/v1/settings/business", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async updateAccountSettings(payload: AccountSettingsFormValues): Promise<User> {
    return apiRequest<User>("/api/v1/settings/account", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
