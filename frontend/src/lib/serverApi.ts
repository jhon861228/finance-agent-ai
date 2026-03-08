export async function backendRequest(endpoint: string, options: { method?: string; body?: any } = {}) {
  const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3000';
  const API_KEY = import.meta.env.PUBLIC_API_KEY || 'default-secret-key';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response;
}
