import { Request, Response, NextFunction } from 'express';

const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(max = 100, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now > entry.reset) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    entry.count++;
    next();
  };
}
