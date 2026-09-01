import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { AuditService } from "../services/audit.service";
import { AuditAction } from "../types";

const router = Router();

/**
 * GET /api/v1/audit
 * Query immutable consortium audit log.
 */
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { action, actorOrgId, objectId, limit, offset } = req.query as any;

      const result = await AuditService.getLogs({
        action: action as AuditAction,
        actorOrgId,
        objectId,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
