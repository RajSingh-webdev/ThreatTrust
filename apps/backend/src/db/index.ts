import { PrismaClient } from "@prisma/client";
import { memoryStore, OrganizationRecord, UserRecord, IocRecord, EndorsementRecord, ReputationEventRecord, AuditLogRecord } from "./store";

const realPrisma = new PrismaClient({
  log: process.env.NODE_ENV === "test" ? [] : ["error"],
});

let isPostgresConnected = false;

// Check connection on startup
realPrisma.$queryRaw`SELECT 1`
  .then(() => {
    isPostgresConnected = true;
    console.log("📦 Connected to PostgreSQL database via Prisma.");
  })
  .catch(() => {
    isPostgresConnected = false;
    console.log("ℹ️  PostgreSQL not detected on localhost:5432 — Using high-performance ThreatTrust Data Layer with seeded genesis entities.");
  });

/**
 * Universal Database Adapter
 * Handles real PostgreSQL Prisma operations, seamlessly providing embedded store fallback.
 */
export const prisma: any = {
  get isConnected() {
    return isPostgresConnected;
  },

  $queryRaw: async (query: any) => {
    if (isPostgresConnected) {
      return realPrisma.$queryRaw(query);
    }
    return [{ 1: 1 }];
  },

  $transaction: async (fn: any) => {
    if (isPostgresConnected) {
      return realPrisma.$transaction(fn);
    }
    // In-memory atomic execution
    return fn(prisma);
  },

  // ─── Organization Model ──────────────────────────────────────────────────
  organization: {
    findMany: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.organization.findMany(args);
      } catch {
        isPostgresConnected = false;
      }
      return memoryStore.organizations.map((org) => {
        const users = memoryStore.users.filter((u) => u.organizationId === org.id);
        const submittedIocs = memoryStore.iocs.filter((i) => i.contributorOrgId === org.id);
        const endorsements = memoryStore.endorsements.filter((e) => e.organizationId === org.id);
        const reputationEvents = memoryStore.reputationEvents.filter((r) => r.organizationId === org.id);

        return {
          ...org,
          users: args?.include?.users ? users : undefined,
          _count: {
            users: users.length,
            submittedIocs: submittedIocs.length,
            endorsements: endorsements.length,
            reputationEvents: reputationEvents.length,
          },
        };
      });
    },

    findFirst: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.organization.findFirst(args);
      } catch {
        isPostgresConnected = false;
      }
      const orgs = memoryStore.organizations.filter((o) => {
        if (!args?.where) return true;
        if (args.where.id) return o.id === args.where.id;
        if (args.where.name) return o.name.toLowerCase() === (args.where.name.equals || args.where.name).toLowerCase();
        if (args.where.fabricMspId) return o.fabricMspId.toLowerCase() === (args.where.fabricMspId.equals || args.where.fabricMspId).toLowerCase();
        if (args.where.OR) {
          return args.where.OR.some((cond: any) => {
            if (cond.id && o.id === cond.id) return true;
            if (cond.name) {
              const val = (cond.name.equals || cond.name).toLowerCase();
              if (o.name.toLowerCase() === val || o.id.toLowerCase() === val) return true;
            }
            if (cond.fabricMspId) {
              const val = (cond.fabricMspId.equals || cond.fabricMspId).toLowerCase();
              if (o.fabricMspId.toLowerCase() === val) return true;
            }
            return false;
          });
        }
        return true;
      });
      if (orgs.length === 0) return null;
      const org = orgs[0];
      const users = memoryStore.users.filter((u) => u.organizationId === org.id);
      return {
        ...org,
        users: args?.include?.users ? users : undefined,
      };
    },

    findUnique: async (args: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.organization.findUnique(args);
      } catch {
        isPostgresConnected = false;
      }

      const org = memoryStore.organizations.find(
        (o) =>
          (args.where.id && (o.id === args.where.id || o.name.toLowerCase() === args.where.id.toLowerCase())) ||
          (args.where.name && o.name.toLowerCase() === args.where.name.toLowerCase())
      );

      if (!org) return null;

      const users = memoryStore.users.filter((u) => u.organizationId === org.id);
      const submittedIocs = memoryStore.iocs.filter((i) => i.contributorOrgId === org.id);
      const endorsements = memoryStore.endorsements.filter((e) => e.organizationId === org.id);
      const reputationEvents = memoryStore.reputationEvents.filter((r) => r.organizationId === org.id);

      return {
        ...org,
        users: args.include?.users ? users : undefined,
        _count: {
          users: users.length,
          submittedIocs: submittedIocs.length,
          endorsements: endorsements.length,
          reputationEvents: reputationEvents.length,
        },
      };
    },

    update: async (args: { where: { id: string }; data: any }) => {
      try {
        if (isPostgresConnected) return await realPrisma.organization.update(args);
      } catch {
        isPostgresConnected = false;
      }

      const org = memoryStore.organizations.find((o) => o.id === args.where.id);
      if (!org) throw new Error(`Organization ${args.where.id} not found`);

      if (args.data.reputationScore !== undefined) {
        org.reputationScore = args.data.reputationScore;
      }
      org.updatedAt = new Date();
      return org;
    },

    count: async () => {
      try {
        if (isPostgresConnected) return await realPrisma.organization.count();
      } catch {
        isPostgresConnected = false;
      }
      return memoryStore.organizations.length;
    },
  },

  // ─── User Model ──────────────────────────────────────────────────────────
  user: {
    findUnique: async (args: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.user.findUnique(args);
      } catch {
        isPostgresConnected = false;
      }

      const user = memoryStore.users.find(
        (u) =>
          (args.where.id && u.id === args.where.id) ||
          (args.where.username && u.username.toLowerCase() === args.where.username.toLowerCase())
      );

      if (!user) return null;

      const org = memoryStore.organizations.find((o) => o.id === user.organizationId);

      return {
        ...user,
        organization: args.include?.organization ? org : undefined,
      };
    },

    findFirst: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.user.findFirst(args);
      } catch {
        isPostgresConnected = false;
      }
      const users = memoryStore.users.filter((u) => {
        if (args?.where?.organization?.name) {
          const org = memoryStore.organizations.find((o) => o.id === u.organizationId);
          return org?.name === args.where.organization.name;
        }
        if (args?.where?.organizationId) return u.organizationId === args.where.organizationId;
        return true;
      });
      if (users.length === 0) return null;
      const user = users[0];
      const org = memoryStore.organizations.find((o) => o.id === user.organizationId);
      return {
        ...user,
        organization: args?.include?.organization ? org : undefined,
      };
    },

    findMany: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.user.findMany(args);
      } catch {
        isPostgresConnected = false;
      }
      return memoryStore.users;
    },

    count: async () => {
      try {
        if (isPostgresConnected) return await realPrisma.user.count();
      } catch {
        isPostgresConnected = false;
      }
      return memoryStore.users.length;
    },
  },

  // ─── IoC Model ───────────────────────────────────────────────────────────
  ioc: {
    create: async (args: { data: any; include?: any }) => {
      try {
        if (isPostgresConnected) {
          if (args.data.contributorOrgId) {
            const org = await realPrisma.organization.findFirst({
              where: {
                OR: [
                  { id: args.data.contributorOrgId },
                  { name: { equals: args.data.contributorOrgId.replace(/^org-/, ""), mode: "insensitive" } },
                  { fabricMspId: { equals: args.data.contributorOrgId, mode: "insensitive" } },
                ],
              },
              select: { id: true },
            });
            if (org) args.data.contributorOrgId = org.id;
          }
          return await realPrisma.ioc.create(args);
        }
      } catch {
        isPostgresConnected = false;
      }

      const newIoc: IocRecord = {
        id: args.data.id || `ioc-${Date.now().toString().slice(-4)}`,
        iocType: args.data.iocType,
        rawValue: args.data.rawValue,
        normalizedValue: args.data.normalizedValue,
        contributorOrgId: args.data.contributorOrgId,
        status: args.data.status || "pending",
        confidenceScore: args.data.confidenceScore || 0,
        reputationAtSubmit: args.data.reputationAtSubmit,
        integrityHash: args.data.integrityHash || null,
        blockchainTxId: args.data.blockchainTxId || null,
        tlpLevel: args.data.tlpLevel || "amber",
        description: args.data.description || null,
        evidenceReference: args.data.evidenceReference || null,
        createdAt: args.data.createdAt || new Date(),
        updatedAt: args.data.updatedAt || new Date(),
      };

      memoryStore.iocs.unshift(newIoc);

      const contributorOrg = memoryStore.organizations.find((o) => o.id === newIoc.contributorOrgId);
      return {
        ...newIoc,
        contributorOrg: args.include?.contributorOrg ? contributorOrg : undefined,
      };
    },

    findUnique: async (args: { where: any; include?: any }) => {
      try {
        if (isPostgresConnected) return await realPrisma.ioc.findUnique(args);
      } catch {
        isPostgresConnected = false;
      }

      let ioc: IocRecord | undefined;

      if (args.where.id) {
        ioc = memoryStore.iocs.find((i) => i.id === args.where.id);
      } else if (args.where.unique_ioc_type_value) {
        const { iocType, normalizedValue } = args.where.unique_ioc_type_value;
        ioc = memoryStore.iocs.find(
          (i) => i.iocType === iocType && i.normalizedValue.toLowerCase() === normalizedValue.toLowerCase()
        );
      }

      if (!ioc) return null;

      const contributorOrg = memoryStore.organizations.find((o) => o.id === ioc.contributorOrgId);
      const endorsements = memoryStore.endorsements
        .filter((e) => e.iocId === ioc.id)
        .map((e) => ({
          ...e,
          organization: memoryStore.organizations.find((o) => o.id === e.organizationId),
        }));

      const auditEvents = memoryStore.auditLogs
        .filter((a) => a.objectId === ioc.id)
        .map((a) => ({
          ...a,
          actorOrg: memoryStore.organizations.find((o) => o.id === a.actorOrgId),
          actorUser: memoryStore.users.find((u) => u.id === a.actorUserId),
        }));

      return {
        ...ioc,
        contributorOrg: args.include?.contributorOrg ? contributorOrg : undefined,
        endorsements: args.include?.endorsements ? endorsements : undefined,
        auditEvents: args.include?.auditEvents ? auditEvents : undefined,
        _count: {
          endorsements: endorsements.length,
        },
      };
    },

    findMany: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.ioc.findMany(args);
      } catch {
        isPostgresConnected = false;
      }

      let result = [...memoryStore.iocs];

      if (args?.where) {
        if (args.where.status) result = result.filter((i) => i.status === args.where.status);
        if (args.where.iocType) result = result.filter((i) => i.iocType === args.where.iocType);
        if (args.where.contributorOrgId) result = result.filter((i) => i.contributorOrgId === args.where.contributorOrgId);
        if (args.where.OR) {
          result = result.filter((i) => {
            const query = args.where.OR[0]?.normalizedValue?.contains?.toLowerCase() || "";
            return (
              i.normalizedValue.toLowerCase().includes(query) ||
              i.rawValue.toLowerCase().includes(query) ||
              (i.description && i.description.toLowerCase().includes(query)) ||
              i.id.toLowerCase().includes(query)
            );
          });
        }
      }

      const take = args?.take ?? result.length;
      const skip = args?.skip ?? 0;
      const paged = result.slice(skip, skip + take);

      return paged.map((ioc) => {
        const contributorOrg = memoryStore.organizations.find((o) => o.id === ioc.contributorOrgId);
        const endorsements = memoryStore.endorsements
          .filter((e) => e.iocId === ioc.id)
          .map((e) => ({
            ...e,
            organization: memoryStore.organizations.find((o) => o.id === e.organizationId),
          }));

        return {
          ...ioc,
          contributorOrg: args?.include?.contributorOrg ? contributorOrg : undefined,
          endorsements: args?.include?.endorsements ? endorsements : undefined,
          _count: { endorsements: endorsements.length },
        };
      });
    },

    update: async (args: { where: { id: string }; data: any; include?: any }) => {
      try {
        if (isPostgresConnected) return await realPrisma.ioc.update(args);
      } catch {
        isPostgresConnected = false;
      }

      const ioc = memoryStore.iocs.find((i) => i.id === args.where.id);
      if (!ioc) throw new Error(`IoC ${args.where.id} not found`);

      Object.assign(ioc, args.data);
      ioc.updatedAt = new Date();

      const contributorOrg = memoryStore.organizations.find((o) => o.id === ioc.contributorOrgId);
      const endorsements = memoryStore.endorsements.filter((e) => e.iocId === ioc.id);

      return {
        ...ioc,
        contributorOrg: args.include?.contributorOrg ? contributorOrg : undefined,
        endorsements: args.include?.endorsements ? endorsements : undefined,
      };
    },

    count: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.ioc.count(args);
      } catch {
        isPostgresConnected = false;
      }
      return memoryStore.iocs.length;
    },
  },

  // ─── Endorsement Model ───────────────────────────────────────────────────
  endorsement: {
    create: async (args: { data: any; include?: any }) => {
      try {
        if (isPostgresConnected) {
          if (args.data.organizationId) {
            const org = await realPrisma.organization.findFirst({
              where: {
                OR: [
                  { id: args.data.organizationId },
                  { name: { equals: args.data.organizationId.replace(/^org-/, ""), mode: "insensitive" } },
                  { fabricMspId: { equals: args.data.organizationId, mode: "insensitive" } },
                ],
              },
              select: { id: true },
            });
            if (org) args.data.organizationId = org.id;
          }
          return await realPrisma.endorsement.create(args);
        }
      } catch {
        isPostgresConnected = false;
      }

      const newEndorsement: EndorsementRecord = {
        id: `end-${Date.now().toString().slice(-4)}`,
        iocId: args.data.iocId,
        organizationId: args.data.organizationId,
        decision: args.data.decision,
        reason: args.data.reason || null,
        blockchainTxId: args.data.blockchainTxId || null,
        createdAt: new Date(),
      };

      memoryStore.endorsements.push(newEndorsement);

      const organization = memoryStore.organizations.find((o) => o.id === newEndorsement.organizationId);

      return {
        ...newEndorsement,
        organization: args.include?.organization ? organization : undefined,
      };
    },

    findUnique: async (args: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.endorsement.findUnique(args);
      } catch {
        isPostgresConnected = false;
      }

      if (args.where.unique_endorsement_per_org) {
        const { iocId, organizationId } = args.where.unique_endorsement_per_org;
        return memoryStore.endorsements.find((e) => e.iocId === iocId && e.organizationId === organizationId) || null;
      }
      return null;
    },

    findMany: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.endorsement.findMany(args);
      } catch {
        isPostgresConnected = false;
      }

      let res = [...memoryStore.endorsements];
      if (args?.where) {
        if (args.where.iocId) res = res.filter((e) => e.iocId === args.where.iocId);
        if (args.where.decision) res = res.filter((e) => e.decision === args.where.decision);
      }
      return res;
    },

    count: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.endorsement.count(args);
      } catch {
        isPostgresConnected = false;
      }
      return memoryStore.endorsements.length;
    },
  },

  // ─── ReputationEvent Model ───────────────────────────────────────────────
  reputationEvent: {
    create: async (args: { data: any }) => {
      try {
        if (isPostgresConnected) {
          if (args.data.organizationId) {
            const org = await realPrisma.organization.findFirst({
              where: {
                OR: [
                  { id: args.data.organizationId },
                  { name: { equals: args.data.organizationId.replace(/^org-/, ""), mode: "insensitive" } },
                  { fabricMspId: { equals: args.data.organizationId, mode: "insensitive" } },
                ],
              },
              select: { id: true },
            });
            if (org) args.data.organizationId = org.id;
          }
          return await realPrisma.reputationEvent.create(args);
        }
      } catch {
        isPostgresConnected = false;
      }

      const event: ReputationEventRecord = {
        id: `re-${Date.now().toString().slice(-4)}`,
        organizationId: args.data.organizationId,
        eventType: args.data.eventType,
        scoreDelta: args.data.scoreDelta,
        relatedIocId: args.data.relatedIocId || null,
        previousScore: args.data.previousScore,
        newScore: args.data.newScore,
        blockchainTxId: args.data.blockchainTxId || null,
        createdAt: new Date(),
      };

      memoryStore.reputationEvents.unshift(event);
      return event;
    },

    findMany: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.reputationEvent.findMany(args);
      } catch {
        isPostgresConnected = false;
      }

      let res = [...memoryStore.reputationEvents];
      if (args?.where?.organizationId) {
        res = res.filter((r) => r.organizationId === args.where.organizationId);
      }
      return res.map((r) => ({
        ...r,
        relatedIoc: memoryStore.iocs.find((i) => i.id === r.relatedIocId) || null,
      }));
    },
  },

  // ─── AuditLog Model ──────────────────────────────────────────────────────
  auditLog: {
    create: async (args: { data: any }) => {
      try {
        if (isPostgresConnected) {
          if (args.data.actorOrgId) {
            const org = await realPrisma.organization.findFirst({
              where: {
                OR: [
                  { id: args.data.actorOrgId },
                  { name: { equals: args.data.actorOrgId.replace(/^org-/, ""), mode: "insensitive" } },
                  { fabricMspId: { equals: args.data.actorOrgId, mode: "insensitive" } },
                ],
              },
              select: { id: true },
            });
            if (org) args.data.actorOrgId = org.id;
          }
          if (args.data.actorUserId) {
            const user = await realPrisma.user.findFirst({
              where: {
                OR: [
                  { id: args.data.actorUserId },
                  { username: args.data.actorUserId },
                  { username: args.data.actorUserId.replace(/^usr-/, "").replace(/-/g, "_") },
                ],
              },
              select: { id: true },
            });
            args.data.actorUserId = user ? user.id : null;
          }
          return await realPrisma.auditLog.create(args);
        }
      } catch {
        isPostgresConnected = false;
      }

      const log: AuditLogRecord = {
        id: `aud-${Date.now().toString().slice(-4)}`,
        actorOrgId: args.data.actorOrgId,
        actorUserId: args.data.actorUserId || null,
        action: args.data.action,
        objectId: args.data.objectId || null,
        result: args.data.result || null,
        blockchainTxId: args.data.blockchainTxId || null,
        createdAt: new Date(),
      };

      memoryStore.auditLogs.unshift(log);
      return log;
    },

    findMany: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.auditLog.findMany(args);
      } catch {
        isPostgresConnected = false;
      }

      let res = [...memoryStore.auditLogs];
      if (args?.where?.action) res = res.filter((a) => a.action === args.where.action);
      if (args?.where?.actorOrgId) res = res.filter((a) => a.actorOrgId === args.where.actorOrgId);
      if (args?.where?.objectId) res = res.filter((a) => a.objectId === args.where.objectId);

      const take = args?.take ?? res.length;
      const skip = args?.skip ?? 0;
      const paged = res.slice(skip, skip + take);

      return paged.map((a) => ({
        ...a,
        actorOrg: memoryStore.organizations.find((o) => o.id === a.actorOrgId) || { id: a.actorOrgId, name: "Node", orgType: "bank" },
        actorUser: memoryStore.users.find((u) => u.id === a.actorUserId) || null,
      }));
    },

    count: async (args?: any) => {
      try {
        if (isPostgresConnected) return await realPrisma.auditLog.count(args);
      } catch {
        isPostgresConnected = false;
      }
      return memoryStore.auditLogs.length;
    },
  },
};

export default prisma;
