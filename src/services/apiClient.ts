import { getApiBaseUrl } from "@/src/lib/env";

const TOKEN_STORAGE_KEY = "bizpilot_access_token";

export class ApiError extends Error {
  status: number;
  detail?: unknown;

  constructor(message: string, status = 500, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (!token) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  baseUrlOverride?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = 10000, baseUrlOverride, headers, ...rest } = options;
  const baseUrl = baseUrlOverride ?? getApiBaseUrl();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const token = getAuthToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (data && typeof data === "object" && ("detail" in data || "error" in data || "message" in data)
          ? String(
              (data as Record<string, unknown>).detail ??
                (data as Record<string, unknown>).error ??
                (data as Record<string, unknown>).message
            )
          : null) || `Request failed with status ${response.status}`;

      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Backend request timed out. Check your FastAPI server.", 408);
    }
    throw new ApiError(
      err instanceof Error ? err.message : "Unable to reach FastAPI backend.",
      0
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function checkBackendHealth(): Promise<{ reachable: boolean; url: string }> {
  const url = getApiBaseUrl();
  try {
    await apiRequest<{ status?: string }>("/health", { timeoutMs: 2500 });
    return { reachable: true, url };
  } catch {
    return { reachable: false, url };
  }
}
