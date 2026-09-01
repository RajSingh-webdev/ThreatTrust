// ThreatTrust — TypeScript Type Definitions

export type OrgType = 'bank' | 'cert' | 'enterprise_soc';
export type OrgStatus = 'pending' | 'active' | 'suspended';
export type UserRole = 'admin' | 'contributor' | 'reviewer';
export type IocType = 'ip' | 'url' | 'domain' | 'file_hash';
export type IocStatus = 'pending' | 'verified' | 'rejected' | 'flagged';
export type TlpLevel = 'white' | 'green' | 'amber' | 'red';
export type EndorsementDecision = 'endorse' | 'reject' | 'flag';
export type ReputationEventType = 'valid_submission' | 'false_submission' | 'endorsement_given' | 'penalty';
export type AuditAction =
  | 'submit_ioc'
  | 'endorse_ioc'
  | 'reject_ioc'
  | 'verify_ioc'
  | 'flag_ioc'
  | 'register_org'
  | 'integrity_check'
  | 'update_reputation';

export interface Organization {
  id: string;
  name: string;
  orgType: OrgType;
  status: OrgStatus;
  fabricMspId: string;
  reputationScore: number;
  createdAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  username: string;
  role: UserRole;
}

export interface Ioc {
  id: string;
  iocType: IocType;
  rawValue: string;
  normalizedValue: string;
  contributorOrgId: string;
  status: IocStatus;
  confidenceScore: number;
  reputationAtSubmit: number;
  integrityHash: string;
  /** For the FAIL demo: store a different "tampered" current value */
  tamperedCurrentHash?: string;
  blockchainTxId: string | null;
  tlpLevel: TlpLevel;
  description: string;
  evidenceReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Endorsement {
  id: string;
  iocId: string;
  organizationId: string;
  decision: EndorsementDecision;
  reason: string | null;
  blockchainTxId: string | null;
  createdAt: string;
}

export interface ReputationEvent {
  id: string;
  organizationId: string;
  eventType: ReputationEventType;
  scoreDelta: number;
  relatedIocId: string | null;
  relatedIocValue?: string;
  previousScore: number;
  newScore: number;
  blockchainTxId: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actorOrgId: string;
  actorOrgName?: string;
  actorUserId: string | null;
  actorUsername?: string | null;
  action: AuditAction;
  objectId: string | null;
  objectValue?: string | null;
  blockchainTxId: string | null;
  result: string | null;
  createdAt: string;
}
