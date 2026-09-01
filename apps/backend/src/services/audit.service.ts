import prisma from "../db";
import { AuditAction } from "../types";

export interface LogAuditOptions {
  actorOrgId: string;
  actorUserId?: string | null;
  action: AuditAction;
  objectId?: string | null;
  result?: string | null;
  blockchainTxId?: string | null;
}

export class AuditService {
  /**
   * Records an immutable audit log entry into the database and tags it with the Fabric transaction ref.
   */
  public static async log(options: LogAuditOptions) {
    const { actorOrgId, actorUserId, action, objectId, result, blockchainTxId } = options;

    try {
      return await prisma.auditLog.create({
        data: {
          actorOrgId,
          actorUserId: actorUserId ?? null,
          action,
          objectId: objectId ?? null,
          result: result ?? null,
          blockchainTxId: blockchainTxId ?? null,
        },
        include: {
          actorOrg: { select: { id: true, name: true, orgType: true } },
          actorUser: { select: { id: true, username: true, role: true } },
        },
      });
    } catch (err) {
      console.error("Failed to write audit log entry to database:", err);
      return null;
    }
  }

  /**
   * Retrieve audit logs with optional filters.
   */
  public static async getLogs(filters?: {
    action?: AuditAction;
    actorOrgId?: string;
    objectId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters?.action) where.action = filters.action;
    if (filters?.actorOrgId) where.actorOrgId = filters.actorOrgId;
    if (filters?.objectId) where.objectId = filters.objectId;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          actorOrg: { select: { id: true, name: true, orgType: true, fabricMspId: true } },
          actorUser: { select: { id: true, username: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
      }),
    ]);

    return { total, logs };
  }
}
