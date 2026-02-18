import { getToken } from './auth';

const WS_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000')
  .replace(/^http/, 'ws');

let sharedWS: WebSocket | null = null;

export function createWS(): WebSocket | null {
  if (sharedWS && sharedWS.readyState <= WebSocket.OPEN) return sharedWS;
  const token = getToken();
  if (!token) return null;
  sharedWS = new WebSocket(`${WS_URL}/ws?token=${token}`);
  sharedWS.onclose = () => { sharedWS = null; };
  return sharedWS;
}
