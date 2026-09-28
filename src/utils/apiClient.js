import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStorage';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

let isRefreshing = false;
let refreshQueue = [];

function resolveQueue(error) {
  refreshQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
  refreshQueue = [];
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) throw new Error('Failed to refresh token');

  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
}

export async function apiRequest(path, options = {}, { skipAuth = false, _retried = false } = {}) {
  const token = getAccessToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  if (token && !skipAuth) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status !== 401 || skipAuth || _retried) {
    return res;
  }

  if (isRefreshing) {
    await new Promise((resolve, reject) => refreshQueue.push({ resolve, reject }));
    return apiRequest(path, options, { skipAuth, _retried: true });
  }

  isRefreshing = true;
  try {
    await refreshAccessToken();
    resolveQueue(null);
    return apiRequest(path, options, { skipAuth, _retried: true });
  } catch (err) {
    resolveQueue(err);
    clearTokens();
    throw err;
  } finally {
    isRefreshing = false;
  }
}

export async function apiJson(path, options = {}, config = {}) {
  const res = await apiRequest(path, options, config);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.message || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}