import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  requireAuth,
} from '../middleware/authMiddleware.js';

const router = Router();

router.get('/protected', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    message: 'You are authenticated',
    userId: req.userId,
  });
});

export default router;