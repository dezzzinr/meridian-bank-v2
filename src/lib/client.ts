/** Browser helpers; the token supports embedded previews without cookies. */
const TOKEN_KEY = "meridian_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // The httpOnly cookie may still be available.
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token && !headers.has("x-meridian-session")) headers.set("x-meridian-session", token);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(path, { ...init, headers });
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "REQUEST_FAILED",
    public hint = "",
    public errorId = "",
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** Keep structured API errors; never render an HTML error page as a message. */
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(path, init);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiRequestError(
      "Unable to reach the server. Check your connection and try again.",
      0,
      "NETWORK_ERROR",
      "For localhost, make sure npm run dev is still running.",
    );
  }
  const body: unknown = await response.json().catch(() => null);
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiRequestError("Your session has expired. Sign in again to view your payments.", 401, "AUTH_REQUIRED");
    }
    const message = typeof record.error === "string"
      ? record.error
      : `The server returned HTTP ${response.status}. Check the terminal running your local app for details.`;
    throw new ApiRequestError(
      message,
      response.status,
      typeof record.code === "string" ? record.code : "REQUEST_FAILED",
      typeof record.hint === "string" ? record.hint : "",
      typeof record.errorId === "string" ? record.errorId : "",
    );
  }
  if (!body || typeof body !== "object") {
    throw new ApiRequestError("The server returned an unexpected response. Refresh and try again.", response.status, "INVALID_RESPONSE");
  }
  return body as T;
}
