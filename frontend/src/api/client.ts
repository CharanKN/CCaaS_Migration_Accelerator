const TOKEN_KEY = 'ccaas_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: Record<string, string>;
  auth?: boolean;
  params?: Record<string, string | undefined>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, form, auth = true, params } = opts;

  let query = '';
  if (params) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) usp.set(k, v);
    }
    const qs = usp.toString();
    if (qs) query = `?${qs}`;
  }

  const headers: Record<string, string> = {};
  let fetchBody: BodyInit | undefined;

  if (form) {
    fetchBody = new URLSearchParams(form).toString();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (body !== undefined) {
    fetchBody = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${path}${query}`, { method, headers, body: fetchBody });

  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new CustomEvent('ccaas:unauthorized'));
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | undefined>) => request<T>(path, { params }),
  post: <T>(path: string, body?: unknown, params?: Record<string, string | undefined>) =>
    request<T>(path, { method: 'POST', body, params }),
  postForm: <T>(path: string, form: Record<string, string>) =>
    request<T>(path, { method: 'POST', form, auth: false }),
};
