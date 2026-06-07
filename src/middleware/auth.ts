import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '@anima-labs/research-commons-shared';

// The old hardcoded fallback. It's public (it's in the git history), so any
// token signed with it is forgeable — including admin tokens. We refuse to use
// it: in production a real JWT_SECRET is mandatory, and in dev we generate a
// random per-boot secret instead of falling back to a known string.
const INSECURE_DEFAULT = 'change-this-in-production';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret && secret !== INSECURE_DEFAULT) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    const reason = secret === INSECURE_DEFAULT
      ? `JWT_SECRET is set to the publicly-known default '${INSECURE_DEFAULT}'`
      : 'JWT_SECRET is not set';
    throw new Error(
      `${reason}. Refusing to start in production: set JWT_SECRET to a long, ` +
      'random secret. Anyone who knows the secret can forge admin tokens.'
    );
  }

  // Development/test only: generate a random secret each boot so tokens can't
  // be forged with the known default. Sessions won't survive a restart — set
  // JWT_SECRET explicitly if you need them to persist.
  console.warn(
    '[auth] JWT_SECRET is not set; using a random per-boot secret for ' +
    'development. Existing sessions are invalidated on restart. Setting a ' +
    'strong JWT_SECRET is REQUIRED in production (NODE_ENV=production).'
  );
  return crypto.randomBytes(32).toString('hex');
}

export const JWT_SECRET = resolveJwtSecret();

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export function generateToken(user: User): string {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      roles: user.roles
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    req.userId = decoded.userId;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
      name: '', // Will be filled from DB if needed
      created_at: new Date()
    };
    next();
  });
}

export function requireRole(role: User['roles'][0]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.roles.includes(role)) {
      res.status(403).json({ error: `Requires ${role} role` });
      return;
    }
    next();
  };
}

export function requireAnyRole(roles: User['roles']) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.some(role => req.user!.roles.includes(role))) {
      res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (!err && decoded) {
      req.userId = decoded.userId;
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        roles: decoded.roles,
        name: '',
        created_at: new Date()
      };
    }
    next();
  });
}

