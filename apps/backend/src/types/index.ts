import { Request } from "express";

export type OrgType = "bank" | "cert" | "enterprise_soc";
export type OrgStatus = "pending" | "active" | "suspended";
export type UserRole = "admin" | "contributor" | "reviewer";
export type UserStatus = "active" | "suspended";
export type IocType = "ip" | "url" | "domain" | "file_hash";
export type IocStatus = "pending" | "verified" | "rejected" | "flagged";
export type TlpLevel = "white" | "green" | "amber" | "red";
export type EndorsementDecision = "endorse" | "reject" | "flag";
export type ReputationEventType = "valid_submission" | "false_submission" | "endorsement_given" | "penalty";
export type AuditAction =
  | "submit_ioc"
  | "endorse_ioc"
  | "reject_ioc"
  | "verify_ioc"
  | "flag_ioc"
  | "register_org"
  | "integrity_check"
  | "update_reputation";

export interface JwtPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface IocSubmissionDto {
  iocType: IocType;
  rawValue: string;
  tlpLevel?: TlpLevel;
  description?: string;
  evidenceReference?: string;
}

export interface EndorsementDto {
  decision: EndorsementDecision;
  reason?: string;
}

export interface IntegrityVerificationResult {
  iocId: string;
  iocType: IocType;
  normalizedValue: string;
  storedIntegrityHash: string;
  calculatedIntegrityHash: string;
  match: boolean;
  tamperDetected: boolean;
  serializationString: string;
  blockchainTxId: string | null;
  status: "PASS" | "FAIL";
}

export interface BlockchainTransactionResult {
  txId: string | null;
  status: "COMMITTED" | "PENDING" | "FAILED" | "FABRIC_UNAVAILABLE" | "BLOCKCHAIN_NOT_CONNECTED";
  blockNumber?: number;
  channel: string;
  chaincode: string;
  functionName: string;
  payload?: any;
}
