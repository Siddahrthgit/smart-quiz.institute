import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  userId?: string;
}

export interface IdentifiedRequest extends Request {
  ownerId?: string;
  ownerType?: 'user' | 'guest';
}

// Accepts EITHER a real logged-in user (Bearer JWT) OR an anonymous guest
// (x-guest-id header, a UUID the client generates and stores locally).
// Every upload/exam/notes/suggestions route requires one of the two so
// data is always isolated to a single owner - no fully-anonymous, unscoped
// access is allowed anymore.
export function identifyOwner(req: IdentifiedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET not configured');
      const payload = jwt.verify(token, secret) as { userId: string };
      req.ownerId = payload.userId;
      req.ownerType = 'user';
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  const guestId = req.headers['x-guest-id'];
  if (typeof guestId === 'string' && guestId.trim().length >= 8) {
    req.ownerId = guestId.trim();
    req.ownerType = 'guest';
    return next();
  }

  return res.status(401).json({ error: 'Login or a guest session is required for this action' });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice('Bearer '.length);
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const payload = jwt.verify(token, secret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
