const DEFAULT_FASTAPI_URL = "http://localhost:8000";

export function getApiBaseUrl(): string {
  const fromVite = import.meta.env.VITE_API_URL as string | undefined;
  const fromStorage =
    typeof window !== "undefined"
      ? window.localStorage.getItem("bizpilot_api_url")
      : null;

  const raw = (fromStorage || fromVite || DEFAULT_FASTAPI_URL).trim();
  return raw.replace(/\/+$/, "");
}

export function setCustomApiBaseUrl(url: string): void {
  if (typeof window === "undefined") return;
  if (!url.trim()) {
    window.localStorage.removeItem("bizpilot_api_url");
  } else {
    window.localStorage.setItem("bizpilot_api_url", url.trim().replace(/\/+$/, ""));
  }
}

export const ENV_CONFIG = {
  defaultApiUrl: DEFAULT_FASTAPI_URL,
  isDev: import.meta.env.DEV,
};
