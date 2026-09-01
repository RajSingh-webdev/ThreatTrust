import { createHash } from "crypto";
import { IocType, IntegrityVerificationResult } from "../types";
import { BlockchainService } from "./blockchain.service";

export interface IntegrityPayload {
  iocId: string;
  iocType: IocType | string;
  normalizedValue: string;
  contributorOrgId: string;
  createdAtUnix: number; // Unix timestamp in seconds
}

export class IntegrityService {
  /**
   * Reconstruct the canonical deterministic serialization string:
   * ioc_id|ioc_type|normalized_value|contributor_org_id|created_at_unix
   */
  public static buildSerializationString(payload: IntegrityPayload): string {
    const { iocId, iocType, normalizedValue, contributorOrgId, createdAtUnix } = payload;
    const orgId = BlockchainService.resolveOrg(contributorOrgId).ledgerOrgId;
    return `${iocId}|${iocType}|${normalizedValue}|${orgId}|${createdAtUnix}`;
  }

  /**
   * Calculate deterministic SHA-256 hash over the canonical string.
   */
  public static calculateHash(payload: IntegrityPayload): string {
    const serialization = this.buildSerializationString(payload);
    return createHash("sha256").update(serialization, "utf8").digest("hex");
  }

  /**
   * Convert Date or ISO string to Unix timestamp in seconds.
   */
  public static dateToUnixSeconds(date: Date | string | number): number {
    if (typeof date === "number") {
      return date > 1e11 ? Math.floor(date / 1000) : date;
    }
    const ms = new Date(date).getTime();
    return Math.floor(ms / 1000);
  }

  /**
   * Verify integrity of an IoC against its anchored hash.
   */
  public static verifyIntegrity(
    ioc: {
      id: string;
      iocType: string;
      normalizedValue: string;
      contributorOrgId: string;
      createdAt: Date | string | number;
      integrityHash: string | null;
      blockchainTxId: string | null;
    },
    overrideHashForTamperDemo?: string
  ): IntegrityVerificationResult {
    const createdAtUnix = this.dateToUnixSeconds(ioc.createdAt);
    const serializationString = this.buildSerializationString({
      iocId: ioc.id,
      iocType: ioc.iocType,
      normalizedValue: ioc.normalizedValue,
      contributorOrgId: ioc.contributorOrgId,
      createdAtUnix,
    });

    const calculatedIntegrityHash = overrideHashForTamperDemo ?? this.calculateHash({
      iocId: ioc.id,
      iocType: ioc.iocType,
      normalizedValue: ioc.normalizedValue,
      contributorOrgId: ioc.contributorOrgId,
      createdAtUnix,
    });

    const storedIntegrityHash = ioc.integrityHash ?? "";
    const match = storedIntegrityHash.length > 0 && storedIntegrityHash.toLowerCase() === calculatedIntegrityHash.toLowerCase();

    return {
      iocId: ioc.id,
      iocType: ioc.iocType as IocType,
      normalizedValue: ioc.normalizedValue,
      storedIntegrityHash,
      calculatedIntegrityHash,
      match,
      tamperDetected: !match,
      serializationString,
      blockchainTxId: ioc.blockchainTxId,
      status: match ? "PASS" : "FAIL",
    };
  }
}
