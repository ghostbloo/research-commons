import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken, requireRole, requireAnyRole, JWT_SECRET } from './auth.js';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'researcher@example.com',
  name: 'Test Researcher',
  roles: ['researcher', 'admin'],
  created_at: new Date(),
};

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

describe('generateToken', () => {
  it('signs a verifiable JWT carrying userId, email, roles and a 7d expiry', () => {
    // generateToken only reads id/email/roles off the user; the cast keeps the runtime call honest.
    const token = generateToken(user as any);
    const decoded = jwt.verify(token, JWT_SECRET) as Record<string, any>;

    expect(decoded.userId).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.roles).toEqual(user.roles);
    // 7-day window between iat and exp.
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
  });
});

describe('requireRole', () => {
  it('calls next() when the user has the required role', () => {
    const res = mockRes();
    const next = vi.fn();
    requireRole('admin')({ user: { roles: ['researcher', 'admin'] } } as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 403 when the user lacks the required role', () => {
    const res = mockRes();
    const next = vi.fn();
    requireRole('admin')({ user: { roles: ['viewer'] } } as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 403 when there is no authenticated user', () => {
    const res = mockRes();
    const next = vi.fn();
    requireRole('admin')({} as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAnyRole', () => {
  it('passes when the user holds any one of the allowed roles', () => {
    const res = mockRes();
    const next = vi.fn();
    requireAnyRole(['admin', 'researcher'])({ user: { roles: ['researcher'] } } as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 403 when the user holds none of the allowed roles', () => {
    const res = mockRes();
    const next = vi.fn();
    requireAnyRole(['admin', 'researcher'])({ user: { roles: ['viewer'] } } as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
