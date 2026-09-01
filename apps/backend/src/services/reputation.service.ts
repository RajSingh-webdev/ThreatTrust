import prisma from "../db";
import { ReputationEventType } from "../types";
import { BlockchainService } from "./blockchain.service";
import { AuditService } from "./audit.service";
import { config } from "../config/env";

export class ReputationService {
  /**
   * Check if organization is restricted from submitting IoCs (< 30 reputation).
   */
  public static async isRestricted(organizationId: string): Promise<{ restricted: boolean; currentScore: number }> {
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { id: organizationId },
          { name: { equals: organizationId.replace(/^org-/, ""), mode: "insensitive" } },
          { fabricMspId: { equals: organizationId, mode: "insensitive" } },
        ],
      },
      select: { id: true, reputationScore: true, name: true },
    });

    if (!org) {
      throw new Error(`Organization ${organizationId} not found.`);
    }

    return {
      restricted: org.reputationScore < config.reputation.restrictionThreshold,
      currentScore: org.reputationScore,
    };
  }

  /**
   * Adjust organization reputation score and record immutable event.
   */
  public static async adjustScore(
    organizationId: string,
    delta: number,
    eventType: ReputationEventType,
    relatedIocId?: string | null,
    reason?: string
  ) {
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { id: organizationId },
          { name: { equals: organizationId.replace(/^org-/, ""), mode: "insensitive" } },
          { fabricMspId: { equals: organizationId, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, reputationScore: true, fabricMspId: true },
    });

    if (!org) {
      throw new Error(`Organization ${organizationId} not found.`);
    }

    const previousScore = org.reputationScore;
    // Bound score between 0 and 100
    const newScore = Math.max(0, Math.min(100, previousScore + delta));

    // Anchor to mock Blockchain Service
    const tx = await BlockchainService.updateReputation(org.id, delta, newScore, relatedIocId);

    // Atomic transaction: update org score + insert reputation event + log audit
    const result = await prisma.$transaction(async (txPrisma: any) => {
      const updatedOrg = await txPrisma.organization.update({
        where: { id: org.id },
        data: { reputationScore: newScore },
      });

      const event = await txPrisma.reputationEvent.create({
        data: {
          organizationId: org.id,
          eventType,
          scoreDelta: delta,
          relatedIocId: relatedIocId ?? null,
          previousScore,
          newScore,
          blockchainTxId: tx.txId,
        },
      });

      return { updatedOrg, event };
    });

    // Audit log
    await AuditService.log({
      actorOrgId: org.id,
      action: "update_reputation",
      objectId: relatedIocId ?? org.id,
      result: `Reputation ${delta >= 0 ? "+" + delta : delta} points (${previousScore} -> ${newScore}). Reason: ${reason ?? eventType}`,
      blockchainTxId: tx.txId,
    });

    return result;
  }

  /**
   * Award +1 reputation point for a verified IoC contribution.
   */
  public static async awardVerifiedContribution(organizationId: string, iocId: string) {
    return this.adjustScore(
      organizationId,
      config.reputation.verifiedReward,
      "valid_submission",
      iocId,
      "IoC reached 2/2 peer endorsement threshold and was verified."
    );
  }

  /**
   * Deduct -3 reputation points for a confirmed false/invalid submission.
   */
  public static async penalizeFalseSubmission(organizationId: string, iocId: string) {
    return this.adjustScore(
      organizationId,
      config.reputation.falsePenalty,
      "false_submission",
      iocId,
      "IoC confirmed as false positive / invalid report by peer consensus."
    );
  }

  /**
   * Get reputation history for an organization.
   */
  public static async getHistory(organizationId: string) {
    return prisma.reputationEvent.findMany({
      where: { organizationId },
      include: {
        relatedIoc: {
          select: {
            id: true,
            iocType: true,
            normalizedValue: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
