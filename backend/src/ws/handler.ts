import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const clients = new Map<string, Set<WebSocket>>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) return ws.close(4001, 'Missing token');

    try {
      const { userId } = jwt.verify(token, config.jwtSecret) as { userId: string };
      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId)!.add(ws);
      ws.on('close', () => clients.get(userId)?.delete(ws));
    } catch {
      ws.close(4001, 'Invalid token');
    }
  });
}

export function broadcast(userId: string, data: unknown) {
  const sockets = clients.get(userId);
  if (!sockets) return;
  const msg = JSON.stringify(data);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}
