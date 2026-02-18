import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const userClients = new Map<string, Set<WebSocket>>();
const projectClients = new Map<string, Set<WebSocket>>();
const wsUserMap = new Map<WebSocket, string>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) return ws.close(4001, 'Missing token');

    try {
      const { userId } = jwt.verify(token, config.jwtSecret) as { userId: string };
      if (!userClients.has(userId)) userClients.set(userId, new Set());
      userClients.get(userId)!.add(ws);
      wsUserMap.set(ws, userId);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'join-project' && msg.projectId) {
            const pid = msg.projectId as string;
            if (!projectClients.has(pid)) projectClients.set(pid, new Set());
            projectClients.get(pid)!.add(ws);
          }
        } catch {}
      });

      ws.on('close', () => {
        userClients.get(userId)?.delete(ws);
        wsUserMap.delete(ws);
        for (const [, sockets] of projectClients) sockets.delete(ws);
      });
    } catch {
      ws.close(4001, 'Invalid token');
    }
  });
}

export function broadcast(userId: string, data: unknown) {
  const sockets = userClients.get(userId);
  if (!sockets) return;
  const msg = JSON.stringify(data);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

export function broadcastToProject(projectId: string, data: unknown) {
  const sockets = projectClients.get(projectId);
  if (!sockets) return;
  const msg = JSON.stringify(data);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}
