import { getToken } from './auth';

const WS_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000')
  .replace(/^http/, 'ws');

export function createWS(): WebSocket | null {
  const token = getToken();
  if (!token) return null;
  return new WebSocket(`${WS_URL}/ws?token=${token}`);
}
