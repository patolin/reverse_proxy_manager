import { formatMessage, messages } from "./messages.js";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(messages.unexpectedResponse);
  }

  return response.json();
}

export async function apiRequest(path, { body, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(payload?.error ?? formatMessage(messages.requestFailed, { status: response.status }), response.status);
  }

  return payload;
}

export async function getCurrentUser() {
  try {
    const response = await apiRequest("/api/auth/me");
    return response.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
