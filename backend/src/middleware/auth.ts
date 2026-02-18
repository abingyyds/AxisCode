import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AuthRequest } from '../types/index.js';

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
      req.userId = payload.userId;
    } catch { /* ignore invalid token */ }
  }
  next();
}
