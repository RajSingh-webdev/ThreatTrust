/**
 * ThreatTrust — Clean State Mock Data (Demo Ready)
 *
 * All previous test indicators and IP addresses have been cleared.
 * Provides a fresh clean slate:
 * - 3 active organizations (BankA, BankB, CERTC) with initial reputation = 50
 * - 6 default analyst & reviewer user accounts
 * - 0 previous test IoCs
 * - 0 previous endorsements
 * - 0 previous reputation events
 * - Baseline registration audit logs
 */

import type {
  Organization, User, Ioc, Endorsement,
  ReputationEvent, AuditEntry,
} from './types';

// ─── Organizations ────────────────────────────────────────────────────────────
export const ORGANIZATIONS: Record<string, Organization> = {
  'org-banka': {
    id: 'org-banka',
    name: 'BankA',
    orgType: 'bank',
    status: 'active',
    fabricMspId: 'BankAMSP',
    reputationScore: 50,
    createdAt: '2024-01-15T09:00:00Z',
  },
  'org-bankb': {
    id: 'org-bankb',
    name: 'BankB',
    orgType: 'bank',
    status: 'active',
    fabricMspId: 'BankBMSP',
    reputationScore: 50,
    createdAt: '2024-01-15T09:00:00Z',
  },
  'org-certc': {
    id: 'org-certc',
    name: 'CERTC',
    orgType: 'cert',
    status: 'active',
    fabricMspId: 'CERTCMSP',
    reputationScore: 50,
    createdAt: '2024-01-15T09:00:00Z',
  },
};

export const ORGS_LIST: Organization[] = Object.values(ORGANIZATIONS);

// ─── Users ────────────────────────────────────────────────────────────────────
export const USERS: Record<string, User> = {
  'user-banka-admin': {
    id: 'user-banka-admin',
    organizationId: 'org-banka',
    username: 'banka_admin',
    role: 'admin',
  },
  'user-banka-analyst': {
    id: 'user-banka-analyst',
    organizationId: 'org-banka',
    username: 'banka_analyst',
    role: 'contributor',
  },
  'user-bankb-analyst': {
    id: 'user-bankb-analyst',
    organizationId: 'org-bankb',
    username: 'bankb_analyst',
    role: 'contributor',
  },
  'user-bankb-reviewer': {
    id: 'user-bankb-reviewer',
    organizationId: 'org-bankb',
    username: 'bankb_reviewer',
    role: 'reviewer',
  },
  'user-certc-analyst': {
    id: 'user-certc-analyst',
    organizationId: 'org-certc',
    username: 'certc_analyst',
    role: 'contributor',
  },
  'user-certc-reviewer': {
    id: 'user-certc-reviewer',
    organizationId: 'org-certc',
    username: 'certc_reviewer',
    role: 'reviewer',
  },
};

// ─── IoCs (Clean Slate) ───────────────────────────────────────────────────────
export const IOCS: Record<string, Ioc> = {};
export const IOCS_LIST: Ioc[] = [];

// ─── Endorsements ─────────────────────────────────────────────────────────────
export const ENDORSEMENTS: Endorsement[] = [];

export function getEndorsementsForIoc(iocId: string): Endorsement[] {
  return ENDORSEMENTS.filter(e => e.iocId === iocId);
}

export function getEndorseCount(iocId: string): number {
  return ENDORSEMENTS.filter(e => e.iocId === iocId && e.decision === 'endorse').length;
}

// ─── Reputation History ───────────────────────────────────────────────────────
export const REPUTATION_EVENTS: ReputationEvent[] = [];

// ─── Audit Trail ──────────────────────────────────────────────────────────────
const rawAuditLog: AuditEntry[] = [
  {
    id: 'aud-r1',
    actorOrgId: 'org-banka',
    actorOrgName: 'BankA',
    actorUserId: 'user-banka-admin',
    actorUsername: 'banka_admin',
    action: 'register_org',
    objectId: 'org-banka',
    objectValue: 'BankA',
    blockchainTxId: 'aabc1234567890123456789012345678901234567890123456789012345678aa',
    result: 'Organization registered and authorized on Hyperledger Fabric',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'aud-r2',
    actorOrgId: 'org-bankb',
    actorOrgName: 'BankB',
    actorUserId: 'user-bankb-analyst',
    actorUsername: 'bankb_analyst',
    action: 'register_org',
    objectId: 'org-bankb',
    objectValue: 'BankB',
    blockchainTxId: 'bbcd2345678901234567890123456789012345678901234567890123456789bb',
    result: 'Organization registered and authorized on Hyperledger Fabric',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'aud-r3',
    actorOrgId: 'org-certc',
    actorOrgName: 'CERTC',
    actorUserId: 'user-certc-analyst',
    actorUsername: 'certc_analyst',
    action: 'register_org',
    objectId: 'org-certc',
    objectValue: 'CERTC',
    blockchainTxId: 'ccde3456789012345678901234567890123456789012345678901234567890cc',
    result: 'Organization registered and authorized on Hyperledger Fabric',
    createdAt: new Date().toISOString(),
  },
];

export const AUDIT_LOG: AuditEntry[] = [...rawAuditLog].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getIocsForOrg(_orgId: string): Ioc[] {
  return IOCS_LIST;
}

export function getPendingForEndorsement(orgId: string): Ioc[] {
  return IOCS_LIST.filter(ioc => {
    if (ioc.status !== 'pending') return false;
    if (ioc.contributorOrgId === orgId) return false;
    const alreadyEndorsed = ENDORSEMENTS.some(
      e => e.iocId === ioc.id && e.organizationId === orgId
    );
    return !alreadyEndorsed;
  });
}

export function getOrgStats(orgId: string) {
  const submitted = IOCS_LIST.filter(i => i.contributorOrgId === orgId);
  const verified = submitted.filter(i => i.status === 'verified');
  const pending = submitted.filter(i => i.status === 'pending');
  const rejected = submitted.filter(i => i.status === 'rejected');
  const pendingEndorse = getPendingForEndorsement(orgId);
  const repEvents = REPUTATION_EVENTS.filter(r => r.organizationId === orgId);
  return { submitted, verified, pending, rejected, pendingEndorse, repEvents };
}

export function getReputationHistory(orgId: string): ReputationEvent[] {
  return REPUTATION_EVENTS.filter(r => r.organizationId === orgId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAuditForOrg(orgId: string): AuditEntry[] {
  return AUDIT_LOG.filter(a => a.actorOrgId === orgId || IOCS[a.objectId ?? '']?.contributorOrgId === orgId);
}

export function getAllAuditLog(): AuditEntry[] {
  return AUDIT_LOG;
}
