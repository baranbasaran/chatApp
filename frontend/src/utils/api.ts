import { getStoredToken } from './auth';

const API_BASE_URL = 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth(endpoint: string, options: RequestOptions = {}): Promise<any> {
  const { requiresAuth = true, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  if (requiresAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export const api = {
  get: (endpoint: string, options: RequestOptions = {}) =>
    fetchWithAuth(endpoint, { ...options, method: 'GET' }),

  post: (endpoint: string, data: any, options: RequestOptions = {}) =>
    fetchWithAuth(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
    }),

  put: (endpoint: string, data: any, options: RequestOptions = {}) =>
    fetchWithAuth(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
    }),

  delete: (endpoint: string, options: RequestOptions = {}) =>
    fetchWithAuth(endpoint, { ...options, method: 'DELETE' }),
}; 