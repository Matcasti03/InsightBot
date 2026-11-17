import { supabase } from './supabase';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (options.body && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      'Nao foi possivel conectar ao servidor. Verifique se a API esta em execucao.'
    );
  }

  let payload: { data?: T; error?: string; details?: unknown } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? `Falha na requisicao (${response.status}).`,
      payload?.details
    );
  }

  return payload?.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {})
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {})
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
};
