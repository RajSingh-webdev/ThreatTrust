import { v4 as uuidv4 } from "uuid";
import prisma from "../db";
import {
  IocSubmissionDto,
  EndorsementDto,
  IocType,
  IocStatus,
  TlpLevel,
  IntegrityVerificationResult,
} from "../types";
import { NormalizationService } from "./normalization.service";
import { ValidationService } from "./validation.service";
import { IntegrityService } from "./integrity.service";
import { BlockchainService } from "./blockchain.service";
import { AuditService } from "./audit.service";
import { ReputationService } from "./reputation.service";
import { config } from "../config/env";

export class IocService {
  /**
   * Submit an indicator of compromise to the decentralized trust layer.
   */
  public static async submitIoc(
    dto: IocSubmissionDto,
    actor: { userId: string; organizationId: string; role: string; username: string }
  ) {
    const { iocType, rawValue, tlpLevel = "amber", description, evidenceReference } = dto;

    // 1. Check organization reputation restriction (< 30)
    const { restricted, currentScore } = await ReputationService.isRestricted(actor.organizationId);
    if (restricted) {
      throw new Error(
        `Submission privileges restricted: Organization reputation (${currentScore}) is below the required threshold (${config.reputation.restrictionThreshold}).`
      );
    }

    // 2. Normalize canonical value
    const normalizedValue = NormalizationService.normalize(iocType, rawValue);

    // 3. Validate format according to type
    const validation = ValidationService.validate(iocType, normalizedValue);
    if (!validation.isValid) {
      throw new Error(`Validation failed for ${iocType.toUpperCase()}: ${validation.error}`);
    }

    // 4. Duplicate Detection: Check if (ioc_type, normalized_value) already exists
    const existingIoc = await prisma.ioc.findUnique({
      where: {
        unique_ioc_type_value: {
          iocType,
          normalizedValue,
        },
      },
      include: {
        contributorOrg: { select: { id: true, name: true, orgType: true } },
        _count: { select: { endorsements: true } },
      },
    });

    if (existingIoc) {
      // Audit log the duplicate observation
      await AuditService.log({
        actorOrgId: actor.organizationId,
        actorUserId: actor.userId,
        action: "submit_ioc",
        objectId: existingIoc.id,
        result: `Duplicate detected for (${iocType}, ${normalizedValue}). Routed to existing record ${existingIoc.id}.`,
      });

      return {
        isDuplicate: true,
        message: "Duplicate indicator detected. Routed to existing intelligence record.",
        ioc: existingIoc,
      };
    }

    // 5. Generate IoC ID and compute deterministic Integrity Hash
    const iocId = uuidv4();
    const createdAtDate = new Date();
    const createdAtUnix = IntegrityService.dateToUnixSeconds(createdAtDate);

    const integrityHash = IntegrityService.calculateHash({
      iocId,
      iocType,
      normalizedValue,
      contributorOrgId: actor.organizationId,
      createdAtUnix,
    });

    // 6. Anchor to Hyperledger Fabric Blockchain Service
    const tx = await BlockchainService.submitIoC(
      iocId,
      iocType,
      normalizedValue,
      actor.organizationId,
      tlpLevel,
      integrityHash,
      createdAtUnix
    );

    // 7. Save to PostgreSQL
    // Submission itself grants 0 reputation points.
    const createdIoc = await prisma.ioc.create({
      data: {
        id: iocId,
        iocType,
        rawValue,
        normalizedValue,
        contributorOrgId: actor.organizationId,
        status: "pending",
        confidenceScore: 0,
        reputationAtSubmit: currentScore,
        integrityHash,
        blockchainTxId: tx.txId,
        tlpLevel: tlpLevel as TlpLevel,
        description: description ?? null,
        evidenceReference: evidenceReference ?? null,
        createdAt: createdAtDate,
      },
      include: {
        contributorOrg: { select: { id: true, name: true, orgType: true } },
      },
    });

    // 8. Create Audit Entry
    await AuditService.log({
      actorOrgId: actor.organizationId,
      actorUserId: actor.userId,
      action: "submit_ioc",
      objectId: createdIoc.id,
      result: `New indicator submitted (${iocType}: ${normalizedValue}). Initial status: pending.`,
      blockchainTxId: tx.txId,
    });

    return {
      isDuplicate: false,
      ioc: createdIoc,
    };
  }

  /**
   * Cast an endorsement, rejection, or flag on a pending IoC.
   */
  public static async endorseIoc(
    iocId: string,
    dto: EndorsementDto,
    actor: { userId: string; organizationId: string; role: string }
  ) {
    const { decision, reason } = dto;

    // 1. Fetch IoC
    const ioc = await prisma.ioc.findUnique({
      where: { id: iocId },
      include: {
        contributorOrg: true,
        endorsements: true,
      },
    });

    if (!ioc) {
      throw new Error(`Threat indicator ${iocId} not found.`);
    }

    const submitterOrg = BlockchainService.resolveOrg(ioc.contributorOrgId).ledgerOrgId;
    const actorOrg = BlockchainService.resolveOrg(actor.organizationId).ledgerOrgId;

    // 2. Strict Anti-Sybil Rule: Submitter organization cannot endorse its own IoC
    if (ioc.contributorOrgId === actor.organizationId || submitterOrg === actorOrg) {
      throw new Error(
        "Self-endorsement prohibited: An organization cannot endorse or review its own submitted indicator."
      );
    }

    // 3. Check if already reviewed by this organization
    const hasAlreadyReviewed = ioc.endorsements?.some(
      (e: any) => e.organizationId === actor.organizationId || BlockchainService.resolveOrg(e.organizationId).ledgerOrgId === actorOrg
    );

    if (hasAlreadyReviewed) {
      throw new Error(
        `Duplicate endorsement prohibited: Organization has already submitted a review for indicator ${iocId}.`
      );
    }

    // 4. Anchor Endorsement Transaction to Blockchain
    const tx = await BlockchainService.endorseIoC(iocId, actor.organizationId, decision, reason);

    // 5. Save Endorsement to DB
    const endorsement = await prisma.endorsement.create({
      data: {
        iocId,
        organizationId: actor.organizationId,
        decision,
        reason: reason ?? null,
        blockchainTxId: tx.txId,
      },
      include: {
        organization: { select: { id: true, name: true, orgType: true } },
      },
    });

    // 6. Audit log the review
    await AuditService.log({
      actorOrgId: actor.organizationId,
      actorUserId: actor.userId,
      action: decision === "endorse" ? "endorse_ioc" : decision === "reject" ? "reject_ioc" : "flag_ioc",
      objectId: iocId,
      result: `Decision: ${decision}. Reason: ${reason ?? "none"}`,
      blockchainTxId: tx.txId,
    });

    // 7. Evaluate State Transitions & Reputation Impact
    let updatedIoc = ioc;

    if (decision === "endorse") {
      // Count total distinct valid non-contributor endorsements
      const allEndorsements = await prisma.endorsement.findMany({
        where: { iocId, decision: "endorse" },
      });

      const endorseCount = allEndorsements.length;

      // Update confidence score
      updatedIoc = await prisma.ioc.update({
        where: { id: iocId },
        data: { confidenceScore: endorseCount },
        include: { contributorOrg: true, endorsements: true },
      });

      // Consensus Threshold Reached (2 independent peer endorsements)
      if (endorseCount >= config.consensus.endorsementThreshold && ioc.status === "pending") {
        const verifyTx = await BlockchainService.verifyIoC(iocId, "verified");

        updatedIoc = await prisma.ioc.update({
          where: { id: iocId },
          data: {
            status: "verified",
            blockchainTxId: verifyTx.txId,
          },
          include: { contributorOrg: true, endorsements: true },
        });

        // Award +1 reputation point to the contributor organization
        await ReputationService.awardVerifiedContribution(ioc.contributorOrgId, iocId);

        // Audit verify action
        await AuditService.log({
          actorOrgId: actor.organizationId,
          actorUserId: actor.userId,
          action: "verify_ioc",
          objectId: iocId,
          result: `Indicator reached consensus threshold (2/2). Status changed to verified. +1 rep awarded to contributor.`,
          blockchainTxId: verifyTx.txId,
        });
      }
    } else if (decision === "reject") {
      // Check if rejection threshold is reached (e.g. 2 rejects or cert rejection)
      const allRejects = await prisma.endorsement.findMany({
        where: { iocId, decision: "reject" },
      });

      if (allRejects.length >= 2 && ioc.status === "pending") {
        const rejectTx = await BlockchainService.verifyIoC(iocId, "rejected");

        updatedIoc = await prisma.ioc.update({
          where: { id: iocId },
          data: {
            status: "rejected",
            blockchainTxId: rejectTx.txId,
          },
          include: { contributorOrg: true, endorsements: true },
        });

        // Apply -3 penalty to submitter for confirmed false submission
        await ReputationService.penalizeFalseSubmission(ioc.contributorOrgId, iocId);

        await AuditService.log({
          actorOrgId: actor.organizationId,
          actorUserId: actor.userId,
          action: "reject_ioc",
          objectId: iocId,
          result: `Indicator confirmed false positive by consensus. Status changed to rejected. -3 rep penalty applied to contributor.`,
          blockchainTxId: rejectTx.txId,
        });
      }
    } else if (decision === "flag") {
      if (ioc.status === "pending") {
        updatedIoc = await prisma.ioc.update({
          where: { id: iocId },
          data: { status: "flagged" },
          include: { contributorOrg: true, endorsements: true },
        });

        await AuditService.log({
          actorOrgId: actor.organizationId,
          actorUserId: actor.userId,
          action: "flag_ioc",
          objectId: iocId,
          result: `Indicator flagged for further investigation.`,
          blockchainTxId: tx.txId,
        });
      }
    }

    return {
      endorsement,
      ioc: updatedIoc,
    };
  }

  /**
   * List indicators with multi-field search, filters, and pagination.
   */
  public static async getIocs(filters?: {
    status?: IocStatus;
    iocType?: IocType;
    contributorOrgId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.iocType) where.iocType = filters.iocType;
    if (filters?.contributorOrgId) where.contributorOrgId = filters.contributorOrgId;

    if (filters?.search) {
      const q = filters.search.trim();
      where.OR = [
        { normalizedValue: { contains: q, mode: "insensitive" } },
        { rawValue: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { id: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, iocs] = await Promise.all([
      prisma.ioc.count({ where }),
      prisma.ioc.findMany({
        where,
        include: {
          contributorOrg: {
            select: { id: true, name: true, orgType: true, reputationScore: true, fabricMspId: true },
          },
          endorsements: {
            include: {
              organization: { select: { id: true, name: true, orgType: true } },
            },
          },
          _count: { select: { endorsements: true } },
        },
        orderBy: { createdAt: "desc" },
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
      }),
    ]);

    return { total, iocs };
  }

  /**
   * Retrieve indicator by ID with full intelligence history.
   */
  public static async getIocById(id: string) {
    const ioc = await prisma.ioc.findUnique({
      where: { id },
      include: {
        contributorOrg: {
          select: { id: true, name: true, orgType: true, reputationScore: true, fabricMspId: true },
        },
        endorsements: {
          include: {
            organization: { select: { id: true, name: true, orgType: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        auditEvents: {
          include: {
            actorOrg: { select: { id: true, name: true } },
            actorUser: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return ioc;
  }

  /**
   * Verify cryptographic integrity of an indicator.
   */
  public static async verifyIocIntegrity(id: string, overrideHashForTamperDemo?: string): Promise<IntegrityVerificationResult & { fabricConnected?: boolean }> {
    const ioc = await prisma.ioc.findUnique({
      where: { id },
    });

    if (!ioc) {
      throw new Error(`Indicator ${id} not found.`);
    }

    const localResult = IntegrityService.verifyIntegrity(ioc, overrideHashForTamperDemo);
    const fabricResult = await BlockchainService.verifyIntegrity(
      id,
      localResult.calculatedIntegrityHash,
      ioc.integrityHash || undefined
    );

    const isMatch = fabricResult.fabricConnected ? fabricResult.match : localResult.match;
    const finalStatus = isMatch ? "PASS" : "FAIL";

    const result = {
      ...localResult,
      match: isMatch,
      tamperDetected: !isMatch,
      status: finalStatus as "PASS" | "FAIL",
      fabricConnected: fabricResult.fabricConnected,
      onChainHash: fabricResult.onChainHash || localResult.storedIntegrityHash,
      calculatedHash: localResult.calculatedIntegrityHash,
      anchoredHash: fabricResult.onChainHash || localResult.storedIntegrityHash,
    };

    // Audit log the check
    await AuditService.log({
      actorOrgId: ioc.contributorOrgId,
      action: "integrity_check",
      objectId: id,
      result: result.match
        ? `Integrity check PASSED. Computed SHA-256 matches on-chain commitment.`
        : `Integrity check FAILED. Computed SHA-256 (${result.calculatedIntegrityHash}) differs from stored anchor (${result.storedIntegrityHash}).`,
    });

    return result;
  }
}
