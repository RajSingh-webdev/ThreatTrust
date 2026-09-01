import { Router, Request, Response, NextFunction } from "express";
import prisma from "../db";
import { authenticate } from "../middlewares/auth.middleware";
import { ReputationService } from "../services/reputation.service";

const router = Router();

/**
 * GET /api/v1/orgs
 * List all participating consortium organizations with live statistics.
 */
router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        orgType: true,
        status: true,
        fabricMspId: true,
        reputationScore: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            submittedIocs: true,
            endorsements: true,
            reputationEvents: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({
      organizations: orgs,
      total: orgs.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/orgs/:id
 * Retrieve organization profile and stats by ID.
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { id },
          { name: { equals: id.replace(/^org-/, ""), mode: "insensitive" } },
          { fabricMspId: { equals: id, mode: "insensitive" } },
        ],
      },
      include: {
        users: {
          select: { id: true, username: true, role: true, status: true },
        },
        _count: {
          select: {
            submittedIocs: true,
            endorsements: true,
            reputationEvents: true,
          },
        },
      },
    });

    if (!org) {
      res.status(404).json({ error: "Not Found", message: `Organization ${id} does not exist.` });
      return;
    }

    res.json({ organization: org });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/orgs/:id/reputation
 * Retrieve organization reputation score standing and restriction status.
 */
router.get(
  "/:id/reputation",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;

      const org = await prisma.organization.findFirst({
        where: {
          OR: [
            { id },
            { name: { equals: id.replace(/^org-/, ""), mode: "insensitive" } },
            { fabricMspId: { equals: id, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          orgType: true,
          reputationScore: true,
          fabricMspId: true,
        },
      });

      if (!org) {
        res.status(404).json({ error: "Not Found", message: `Organization ${id} not found.` });
        return;
      }

      const { restricted } = await ReputationService.isRestricted(org.id);

      res.json({
        organizationId: org.id,
        name: org.name,
        reputationScore: org.reputationScore,
        initialScore: 50,
        netDelta: org.reputationScore - 50,
        isRestricted: restricted,
        restrictionThreshold: 30,
        status: restricted ? "RESTRICTED" : "ACTIVE",
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/orgs/:id/reputation/events
 * Retrieve immutable reputation ledger history for an organization.
 */
router.get(
  "/:id/reputation/events",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const org = await prisma.organization.findFirst({
        where: {
          OR: [
            { id },
            { name: { equals: id.replace(/^org-/, ""), mode: "insensitive" } },
            { fabricMspId: { equals: id, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      const orgId = org ? org.id : id;
      const events = await ReputationService.getHistory(orgId);

      res.json({
        organizationId: orgId,
        events,
        total: events.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
