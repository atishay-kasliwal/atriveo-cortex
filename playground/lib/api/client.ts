import type { ApiErrorResponse, ApiSuccessResponse } from "./response";

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

export async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiSuccessResponse<T> | ApiErrorResponse;

  if (!res.ok || !json.success) {
    const message =
      "error" in json && json.error ? json.error : `Request failed (${res.status})`;
    throw new ApiClientError(message, res.status);
  }

  return json.data;
}
