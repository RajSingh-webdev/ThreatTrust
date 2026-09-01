import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validateBody, validateQuery } from "../middlewares/validate.middleware";
import { IocService } from "../services/ioc.service";
import { AuthenticatedRequest, IocType, IocStatus, TlpLevel, EndorsementDecision } from "../types";

const router = Router();

const submitIocSchema = z.object({
  iocType: z.enum(["ip", "url", "domain", "file_hash"]),
  rawValue: z.string().optional(),
  value: z.string().optional(), // alias support for frontend
  tlpLevel: z.enum(["white", "green", "amber", "red"]).optional(),
  description: z.string().optional(),
  evidenceReference: z.string().optional(),
}).refine((data) => data.rawValue || data.value, {
  message: "Either 'rawValue' or 'value' must be provided.",
  path: ["value"],
});

const endorseSchema = z.object({
  decision: z.enum(["endorse", "reject", "flag"]),
  reason: z.string().optional(),
});

const queryIocsSchema = z.object({
  status: z.enum(["pending", "verified", "rejected", "flagged"]).optional(),
  iocType: z.enum(["ip", "url", "domain", "file_hash"]).optional(),
  contributorOrgId: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

/**
 * GET /api/v1/iocs
 * Query indicators with filters, search, and pagination.
 */
router.get(
  "/",
  authenticate,
  validateQuery(queryIocsSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, iocType, contributorOrgId, search, limit, offset } = req.query as any;

      const result = await IocService.getIocs({
        status: status as IocStatus,
        iocType: iocType as IocType,
        contributorOrgId,
        search,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/iocs/submit and POST /api/v1/iocs
 * Submit a cyber threat indicator to the ledger.
 */
const handleSubmitIoc = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const rawValue = req.body.rawValue || req.body.value;

    const result = await IocService.submitIoc(
      {
        iocType: req.body.iocType,
        rawValue,
        tlpLevel: req.body.tlpLevel as TlpLevel,
        description: req.body.description,
        evidenceReference: req.body.evidenceReference,
      },
      {
        userId: user.userId,
        organizationId: user.organizationId,
        role: user.role,
        username: user.username,
      }
    );

    if (result.isDuplicate) {
      res.status(200).json({
        status: "duplicate",
        message: result.message,
        ioc: result.ioc,
      });
      return;
    }

    res.status(201).json({
      status: "created",
      ioc: result.ioc,
      reputationDelta: 0,
    });
  } catch (err) {
    next(err);
  }
};

router.post(
  "/submit",
  authenticate,
  requireRole(["admin", "contributor"]),
  validateBody(submitIocSchema),
  handleSubmitIoc
);

router.post(
  "/",
  authenticate,
  requireRole(["admin", "contributor"]),
  validateBody(submitIocSchema),
  handleSubmitIoc
);

/**
 * GET /api/v1/iocs/:id
 * Retrieve threat indicator details, endorsements, and audit trail.
 */
router.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const ioc = await IocService.getIocById(id);

      if (!ioc) {
        res.status(404).json({ error: "Not Found", message: `Indicator ${id} not found.` });
        return;
      }

      res.json({ ioc });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/iocs/:id/endorse
 * Submit peer consensus endorsement, rejection, or flag.
 */
router.post(
  "/:id/endorse",
  authenticate,
  requireRole(["admin", "contributor", "reviewer"]),
  validateBody(endorseSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const user = req.user!;

      const result = await IocService.endorseIoc(
        id,
        {
          decision: req.body.decision as EndorsementDecision,
          reason: req.body.reason,
        },
        {
          userId: user.userId,
          organizationId: user.organizationId,
          role: user.role,
        }
      );

      res.status(200).json({
        status: "endorsed",
        endorsement: result.endorsement,
        ioc: result.ioc,
      });
    } catch (err: any) {
      if (err.message.includes("Self-endorsement") || err.message.includes("already submitted")) {
        res.status(400).json({ error: "Endorsement Error", message: err.message });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/iocs/:id/endorsements
 * List all peer endorsements recorded for an indicator.
 */
router.get(
  "/:id/endorsements",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const ioc = await IocService.getIocById(id);

      if (!ioc) {
        res.status(404).json({ error: "Not Found", message: `Indicator ${id} not found.` });
        return;
      }

      res.json({
        iocId: id,
        endorsements: ioc.endorsements,
        total: ioc.endorsements.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/iocs/:id/verify-integrity
 * Cryptographic state integrity verification engine.
 */
router.get(
  "/:id/verify-integrity",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { overrideHash } = req.query as any;

      const verification = await IocService.verifyIocIntegrity(id, overrideHash);

      res.json({
        verification,
      });
    } catch (err: any) {
      if (err.message.includes("not found")) {
        res.status(404).json({ error: "Not Found", message: err.message });
        return;
      }
      next(err);
    }
  }
);

export default router;
