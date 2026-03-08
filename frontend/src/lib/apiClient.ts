export async function addPersonalExpense(userId: string, data: any, token?: string) {
  const BACKEND_URL = (import.meta.env.PUBLIC_BACKEND_URL as string) || window.location.origin;
  const API_KEY = (import.meta.env.PUBLIC_API_KEY as string) || 'development-key';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Forward optional client-side cookie with email if present
  try {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const emailCookie = cookies.find(c => c.startsWith('userEmail=') || c.startsWith('email='));
    if (emailCookie) {
      const emailValue = emailCookie.split('=')[1];
      if (emailValue) headers['X-User-Email'] = decodeURIComponent(emailValue);
    }
  } catch (e) {
    // ignore cookie parsing errors
  }

  const resp = await fetch(`${BACKEND_URL}/api/personal/expenses/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  return resp;
}
