import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export type AuthenticatedRequest = Request & {
  userId?: string;
};

function getAccessTokenSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }

  return secret;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authentication format',
      });
    }

    const decoded = jwt.verify(
      token,
      getAccessTokenSecret()
    );

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded.userId !== 'string'
    ) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid access token',
      });
    }

    req.userId = decoded.userId;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token expired',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid access token',
      });
    }

    console.error('Authentication failed:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
    });
  }
}