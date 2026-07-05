import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RateLimitRequest } from './rateLimiter';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-speakiq-key-2026';

export function authenticateToken(
  req: RateLimitRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    
    req.user = decodedUser as { id: string; email: string; name: string };
    next();
  });
}
