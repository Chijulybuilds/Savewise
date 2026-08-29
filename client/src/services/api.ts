import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import type { ApiErrorBody, ApiErrorCode, ApiSuccess } from '@savewise/shared';

/**
 * The single HTTP client.
 *
 * No component calls axios directly. Everything goes through a domain service
 * (`goalService`, `budgetService`, …) which goes through this module, so
 * authentication, error normalisation and response unwrapping are implemented
 * exactly once.
 *
 * Three responsibilities live here:
 *
 * 1. **Credentials.** `withCredentials` sends the httpOnly auth cookies. There
 *    is no token in JavaScript to attach, which is the point.
 * 2. **Silent refresh.** A 401 triggers one refresh attempt and the original
 *    request is replayed. Concurrent 401s share a single refresh promise rather
 *    than stampeding the endpoint.
 * 3. **Error normalisation.** Every failure — HTTP, network, timeout — becomes
 *    an `ApiError` with a stable `code`, so the UI never has to inspect an
 *    axios error shape.
 */

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: Record<string, string[]> | undefined;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Field-level messages, ready to hand to React Hook Form's `setError`. */
  get fieldErrors(): Record<string, string> {
    if (!this.details) return {};
    return Object.fromEntries(
      Object.entries(this.details)
        .map(([field, messages]) => [field, messages[0]])
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  }

  get isAuthError(): boolean {
    return this.code === 'UNAUTHENTICATED' || this.code === 'INVALID_CREDENTIALS';
  }
}

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

/* -------------------------------------------------------------------------- */
/* Silent refresh                                                              */
/* -------------------------------------------------------------------------- */

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/** Shared across concurrent 401s so only one refresh request is ever in flight. */
let refreshPromise: Promise<void> | null = null;

/** Set by the auth store so a failed refresh can clear client state exactly once. */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

async function refreshSession(): Promise<void> {
  refreshPromise ??= axios
    .post(`${baseURL}/auth/refresh`, null, { withCredentials: true })
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isRefreshCall = config?.url?.includes('/auth/refresh');
    const isLoginCall =
      config?.url?.includes('/auth/login') || config?.url?.includes('/auth/register');

    // Only a genuine "your access token expired" is worth retrying. A failed
    // login is a wrong password, and retrying a failed refresh loops forever.
    if (status === 401 && config && !config._retried && !isRefreshCall && !isLoginCall) {
      config._retried = true;
      try {
        await refreshSession();
        return await api.request(config);
      } catch {
        onSessionExpired?.();
        throw toApiError(error);
      }
    }

    if (status === 401 && isRefreshCall) onSessionExpired?.();

    throw toApiError(error);
  },
);

/* -------------------------------------------------------------------------- */
/* Error normalisation                                                         */
/* -------------------------------------------------------------------------- */

/** Copy the user actually reads. Never the server's raw message for a 5xx. */
const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'Please check the details you entered.',
  401: 'Please sign in to continue.',
  403: 'You do not have access to that.',
  404: 'We could not find what you were looking for.',
  409: 'That conflicts with something that already exists.',
  413: 'That request was too large.',
  422: 'Please check the details you entered.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again.',
  502: 'Savewise is unreachable right now. Please try again shortly.',
  503: 'Savewise is unreachable right now. Please try again shortly.',
};

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  if (error.code === 'ECONNABORTED') {
    return new ApiError('NETWORK_ERROR', 'That took too long. Please try again.', 0);
  }

  if (!error.response) {
    return new ApiError(
      'NETWORK_ERROR',
      'We could not reach Savewise. Check your connection and try again.',
      0,
    );
  }

  const status = error.response.status;
  const body = error.response.data;

  if (body && typeof body === 'object' && 'error' in body && body.error) {
    return new ApiError(
      body.error.code,
      // A 5xx message is written by us, not echoed from the server, so an
      // internal detail that slipped into a message never reaches the screen.
      status >= 500 ? (FALLBACK_MESSAGES[500] as string) : body.error.message,
      status,
      body.error.details,
    );
  }

  return new ApiError(
    status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR',
    FALLBACK_MESSAGES[status] ?? 'Something went wrong. Please try again.',
    status,
  );
}

/* -------------------------------------------------------------------------- */
/* Typed verbs                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Unwraps the `{ success, data }` envelope so services return domain objects.
 * The envelope is a transport detail; it should not leak into components.
 */
function unwrap<T>(payload: ApiSuccess<T>): T {
  return payload.data;
}

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<ApiSuccess<T>>(url, config);
  return unwrap(response.data);
}

export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.post<ApiSuccess<T>>(url, data, config);
  return unwrap(response.data);
}

export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.patch<ApiSuccess<T>>(url, data, config);
  return unwrap(response.data);
}

export async function del(url: string, config?: AxiosRequestConfig): Promise<void> {
  await api.delete(url, config);
}
