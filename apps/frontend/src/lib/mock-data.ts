/**
 * ThreatTrust — Complete Mock Data
 *
 * Business rules enforced:
 * - Initial reputation = 50
 * - Verified contribution: +1 to submitter
 * - Confirmed false: -3 to submitter
 * - Endorsement threshold: 2 independent non-submitter orgs
 * - Self-endorsement NOT allowed
 * - Duplicate key: (ioc_type, normalized_value)
 * - Integrity hash: SHA256(ioc_id|ioc_type|normalized_value|contributor_org_id|created_at_unix)
 */

import type {
  Organization, User, Ioc, Endorsement,
  ReputationEvent, AuditEntry,
} from './types';

// ─── Organizations ────────────────────────────────────────────────────────────
// BankA: 2 verified submissions → 50+1+1 = 52
// BankB: 3 verified + 1 false → 50+1+1+1-3 = 50 (shown as 50, interesting for demo)
//   Actually let's say BankB: 2 verified + 1 false → 50+1+1-3 = 49
// CERTC: 2 verified → 50+1+1 = 52

export const ORGANIZATIONS: Record<string, Organization> = {
  'org-banka': {
    id: 'org-banka',
    name: 'BankA',
    orgType: 'bank',
    status: 'active',
    fabricMspId: 'BankAMSP',
    reputationScore: 52,
    createdAt: '2024-01-15T09:00:00Z',
  },
  'org-bankb': {
    id: 'org-bankb',
    name: 'BankB',
    orgType: 'bank',
    status: 'active',
    fabricMspId: 'BankBMSP',
    reputationScore: 49,
    createdAt: '2024-01-15T09:00:00Z',
  },
  'org-certc': {
    id: 'org-certc',
    name: 'CERTC',
    orgType: 'cert',
    status: 'active',
    fabricMspId: 'CERTCMSP',
    reputationScore: 52,
    createdAt: '2024-01-15T09:00:00Z',
  },
};

export const ORGS_LIST = Object.values(ORGANIZATIONS);

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

// ─── IoCs ─────────────────────────────────────────────────────────────────────
// Integrity hashes computed as SHA256(ioc_id|ioc_type|normalized_value|contributor_org_id|created_at_unix)
export const IOCS: Record<string, Ioc> = {
  'ioc-001': {
    id: 'ioc-001',
    iocType: 'ip',
    rawValue: '45.83.64.1',
    normalizedValue: '45.83.64.1',
    contributorOrgId: 'org-banka',
    status: 'verified',
    confidenceScore: 2,
    reputationAtSubmit: 50,
    integrityHash: '93be512ca089698eb16675f96a46eb8eb7e4b623733c8da1f4ef77ea87a5bf00',
    blockchainTxId: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef012345',
    tlpLevel: 'amber',
    description: 'Confirmed C2 server for Cobalt Strike beacon observed in bank network intrusion. Multiple beaconing sessions detected over port 443.',
    evidenceReference: 'https://internal.banka.corp/soc/incidents/2024-001',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-03T14:22:00Z',
  },
  'ioc-002': {
    id: 'ioc-002',
    iocType: 'domain',
    rawValue: 'c2-server.ru',
    normalizedValue: 'c2-server.ru',
    contributorOrgId: 'org-banka',
    status: 'verified',
    confidenceScore: 2,
    reputationAtSubmit: 51,
    integrityHash: 'ca1c446ac348e79e41416fdaf53f21284216fbbb34ed7fb5f2d57420316b35c5',
    blockchainTxId: 'b2c3d4e5f6780123456789012345678901bcdef2345678901234567890abc123',
    tlpLevel: 'red',
    description: 'Command and control domain used by APT group. DGA-based subdomain generation observed. Hosting malicious payload droppers.',
    evidenceReference: null,
    createdAt: '2024-02-02T11:30:00Z',
    updatedAt: '2024-02-04T09:15:00Z',
  },
  'ioc-003': {
    id: 'ioc-003',
    iocType: 'url',
    rawValue: 'http://phishing-portal.net/secure/login',
    normalizedValue: 'http://phishing-portal.net/secure/login',
    contributorOrgId: 'org-bankb',
    status: 'verified',
    confidenceScore: 2,
    reputationAtSubmit: 50,
    integrityHash: 'ea0a86d69d62953b0377817c3886f8a4d29b156b903cc97390e66c41dd79047a',
    blockchainTxId: 'c3d4e5f67890123456789012345678901cdef3456789012345678901234cd456',
    tlpLevel: 'amber',
    description: 'Active phishing page mimicking customer banking portal. Harvesting credentials and OTP tokens. Multiple customer reports received.',
    evidenceReference: 'https://urlscan.io/result/abc123',
    createdAt: '2024-02-03T14:00:00Z',
    updatedAt: '2024-02-05T10:45:00Z',
  },
  'ioc-004': {
    id: 'ioc-004',
    iocType: 'file_hash',
    rawValue: 'a3c4e5f6b7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
    normalizedValue: 'a3c4e5f6b7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
    contributorOrgId: 'org-banka',
    status: 'verified',
    confidenceScore: 2,
    reputationAtSubmit: 51,
    integrityHash: '67a5630ef25201cf75e7b8d563a9adb89cad7b86d60dcbda5c96f7f732da0173',
    blockchainTxId: 'd4e5f6789012345678901234567890123def4567890123456789012345de7890',
    tlpLevel: 'red',
    description: 'SHA-256 hash of LockBit 3.0 ransomware dropper. Detected in incident affecting 3 workstations. Encrypted files with .lockbit extension.',
    evidenceReference: 'https://virustotal.com/gui/file/a3c4e5f6b7d8',
    createdAt: '2024-02-04T08:30:00Z',
    updatedAt: '2024-02-06T16:00:00Z',
  },
  'ioc-005': {
    id: 'ioc-005',
    iocType: 'ip',
    rawValue: '185.220.101.45',
    normalizedValue: '185.220.101.45',
    contributorOrgId: 'org-bankb',
    status: 'pending',
    confidenceScore: 1,
    reputationAtSubmit: 49,
    integrityHash: '9d5289c845a009e83db4c4e50ee518da773b37405ed7b7a8372a1a70fe188f85',
    blockchainTxId: 'e5f678901234567890123456789012345ef567890123456789012345678ef901',
    tlpLevel: 'amber',
    description: 'Known Tor exit node observed in brute-force attack against banking API endpoints. 40,000+ requests per hour from this IP.',
    evidenceReference: null,
    createdAt: '2024-02-05T10:15:00Z',
    updatedAt: '2024-02-05T10:15:00Z',
  },
  'ioc-006': {
    id: 'ioc-006',
    iocType: 'domain',
    rawValue: 'update-security-center.click',
    normalizedValue: 'update-security-center.click',
    contributorOrgId: 'org-banka',
    status: 'flagged',
    confidenceScore: 0,
    reputationAtSubmit: 52,
    integrityHash: 'd45ccc257901cd22e7ad63c8a6e6947a0513d166e1602c912260827e79d3e22f',
    blockchainTxId: null,
    tlpLevel: 'green',
    description: 'Suspected typosquatting domain for Windows Security Center. Flagged for further investigation — may be legitimate security vendor.',
    evidenceReference: null,
    createdAt: '2024-02-06T13:45:00Z',
    updatedAt: '2024-02-07T09:30:00Z',
  },
  'ioc-007': {
    id: 'ioc-007',
    iocType: 'url',
    rawValue: 'https://malware-download.io/payload?id=42&type=ransomware',
    normalizedValue: 'https://malware-download.io/payload?id=42&type=ransomware',
    contributorOrgId: 'org-certc',
    status: 'verified',
    confidenceScore: 2,
    reputationAtSubmit: 50,
    integrityHash: 'c71dca448cfead3aa6bc7dbefa18987963d5ea2e7d485d766f96f84109b22566',
    blockchainTxId: 'f67890123456789012345678901234567f6789012345678901234567890f1234',
    tlpLevel: 'red',
    description: 'Active malware distribution URL. Serves ransomware payload to victims. Hosted on bulletproof hosting provider in Eastern Europe.',
    evidenceReference: 'https://any.run/report/xyz789',
    createdAt: '2024-02-07T07:00:00Z',
    updatedAt: '2024-02-08T12:10:00Z',
  },
  'ioc-008': {
    id: 'ioc-008',
    iocType: 'ip',
    rawValue: '91.121.87.46',
    normalizedValue: '91.121.87.46',
    contributorOrgId: 'org-bankb',
    status: 'rejected',
    confidenceScore: 0,
    reputationAtSubmit: 50,
    // Tampered record: integrity FAIL demo
    // The on-chain hash is the real computed hash, but we simulate someone changed
    // normalizedValue in the DB → current computed hash would differ
    integrityHash: '3da18efc8cb5dd1d456cbd0c3e8adc204c85be509c8f83b020fff8d81c5af18d',
    tamperedCurrentHash: '9999beef1234abcd5678ef0123456789abcdef0123456789abcdef0123456789',
    blockchainTxId: '78901234567890123456789012345678901234567890123456789012345678ab',
    tlpLevel: 'amber',
    description: 'Submitted as C2 server. Confirmed false positive: this is a legitimate CDN IP address used by major cloud provider. Submission was in error.',
    evidenceReference: null,
    createdAt: '2024-02-08T15:30:00Z',
    updatedAt: '2024-02-10T11:00:00Z',
  },
  'ioc-009': {
    id: 'ioc-009',
    iocType: 'file_hash',
    rawValue: '5f4dcc3b5aa765d61d8327deb882cf99',
    normalizedValue: '5f4dcc3b5aa765d61d8327deb882cf99',
    contributorOrgId: 'org-certc',
    status: 'pending',
    confidenceScore: 0,
    reputationAtSubmit: 52,
    integrityHash: 'd049bda62a56f3f249423130a489ac38498e014a6ecc62fb9ffc7615bfb182ba',
    blockchainTxId: '890abcdef01234567890123456789012345678901234567890123456789012cd',
    tlpLevel: 'amber',
    description: 'MD5 hash of suspected banking trojan. Found in sandboxed environment. Calls to known C2 infrastructure. Awaiting peer review.',
    evidenceReference: null,
    createdAt: '2024-02-26T09:00:00Z',
    updatedAt: '2024-02-26T09:00:00Z',
  },
  'ioc-010': {
    id: 'ioc-010',
    iocType: 'domain',
    rawValue: 'botnet-c2.onion',
    normalizedValue: 'botnet-c2.onion',
    contributorOrgId: 'org-bankb',
    status: 'verified',
    confidenceScore: 2,
    reputationAtSubmit: 49,
    integrityHash: '7fd00288c5491e3b9b69c2ec42baf3e7a93d7edbde07d5cf8e3a790b1de95a02',
    blockchainTxId: '901bcdef234567890123456789012345678901234567890123456789012345ef',
    tlpLevel: 'red',
    description: 'Tor hidden service acting as C2 for Mirai botnet variant. Coordinating DDoS attacks against financial sector targets.',
    evidenceReference: null,
    createdAt: '2024-02-10T14:00:00Z',
    updatedAt: '2024-02-12T08:30:00Z',
  },
  'ioc-011': {
    id: 'ioc-011',
    iocType: 'ip',
    rawValue: '192.42.116.16',
    normalizedValue: '192.42.116.16',
    contributorOrgId: 'org-certc',
    status: 'pending',
    confidenceScore: 1,
    reputationAtSubmit: 52,
    integrityHash: '75a8c1b16457543f4a61a456e96de13722c58e5151593b0ce39e0d770ca578bc',
    blockchainTxId: 'a12bcdef3456789012345678901234567890123456789012345678901234a012',
    tlpLevel: 'amber',
    description: 'IP associated with credential stuffing attacks targeting online banking. 200+ account lockouts observed over 72 hours.',
    evidenceReference: 'https://internal.certc.gov/reports/2024-0211',
    createdAt: '2024-02-11T11:00:00Z',
    updatedAt: '2024-02-11T11:00:00Z',
  },
  'ioc-012': {
    id: 'ioc-012',
    iocType: 'url',
    rawValue: 'http://dropper.xyz/stage2/payload.bin',
    normalizedValue: 'http://dropper.xyz/stage2/payload.bin',
    contributorOrgId: 'org-certc',
    status: 'verified',
    confidenceScore: 2,
    reputationAtSubmit: 51,
    integrityHash: '5c076de93a5599b32e01bff1336a11d7ba7ed4c7e9a007f4ee590c416d6e64d6',
    blockchainTxId: 'b23cdef45678901234567890123456789012345678901234567890123456b123',
    tlpLevel: 'red',
    description: 'Stage-2 payload dropper URL for multi-stage malware campaign. Downloads and executes encrypted shellcode loader. Active since Feb 2024.',
    evidenceReference: null,
    createdAt: '2024-02-12T16:30:00Z',
    updatedAt: '2024-02-14T10:20:00Z',
  },
  'ioc-013': {
    id: 'ioc-013',
    iocType: 'domain',
    rawValue: 'fake-banklogin.com',
    normalizedValue: 'fake-banklogin.com',
    contributorOrgId: 'org-banka',
    status: 'pending',
    confidenceScore: 0,
    reputationAtSubmit: 52,
    integrityHash: '1bf1611e045c78d3a6999c0667a6cf98e932111ad2b51668f2bef2a12a67f9da',
    blockchainTxId: 'c34def5678901234567890123456789012345678901234567890123456c7890',
    tlpLevel: 'amber',
    description: 'Newly registered domain impersonating BankA customer portal. Phishing kit detected. Currently serving credential harvesting page.',
    evidenceReference: 'https://internal.banka.corp/soc/incidents/2024-008',
    createdAt: '2024-02-13T08:15:00Z',
    updatedAt: '2024-02-13T08:15:00Z',
  },
  'ioc-014': {
    id: 'ioc-014',
    iocType: 'file_hash',
    rawValue: '3a7f8b9c1d2e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    normalizedValue: '3a7f8b9c1d2e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    contributorOrgId: 'org-bankb',
    status: 'verified',
    confidenceScore: 2,
    reputationAtSubmit: 50,
    integrityHash: 'ac2f533adb9b1b4c3add29c6f9b0a8939e1d4fd487c9d9792c13f4bc2c60434c',
    blockchainTxId: 'd45ef6789012345678901234567890123456789012345678901234567890de45',
    tlpLevel: 'red',
    description: 'SHA-256 of Emotet loader variant. Used in initial access for ransomware campaigns. Delivered via macro-enabled Word document.',
    evidenceReference: 'https://virustotal.com/gui/file/3a7f8b9c',
    createdAt: '2024-02-14T12:00:00Z',
    updatedAt: '2024-02-16T09:45:00Z',
  },
  // DEMO IoC: BankA submits → BankB endorses → CERTC endorses → verified → BankA +1
  'ioc-015': {
    id: 'ioc-015',
    iocType: 'ip',
    rawValue: '203.0.113.42',
    normalizedValue: '203.0.113.42',
    contributorOrgId: 'org-banka',
    status: 'pending',
    confidenceScore: 0,
    reputationAtSubmit: 52,
    integrityHash: 'f7f70ebe7c1039236a8368cd936af9b9f88bca9109f89c7ff0b83e0a302bb9f0',
    blockchainTxId: 'e56f789012345678901234567890123456789012345678901234567890ef5678',
    tlpLevel: 'amber',
    description: 'Suspected C2 IP detected in threat hunting exercise. Multiple outbound connections to this IP from workstations in the SOC network segment. Awaiting peer validation.',
    evidenceReference: null,
    createdAt: '2024-02-28T14:30:00Z',
    updatedAt: '2024-02-28T14:30:00Z',
  },
  'ioc-016': {
    id: 'ioc-016',
    iocType: 'url',
    rawValue: 'http://phishing.example.com/banklogin?utm_source=email&session=abc123',
    // utm_source removed, session=abc123 kept (meaningful)
    normalizedValue: 'http://phishing.example.com/banklogin?session=abc123',
    contributorOrgId: 'org-bankb',
    status: 'pending',
    confidenceScore: 0,
    reputationAtSubmit: 49,
    integrityHash: 'b4d66566f70ccf371a217a5c032a3ad1d8841299cac8359fe9d715a6b9479452',
    blockchainTxId: 'f678901234567890123456789012345678901234567890123456789012f34567',
    tlpLevel: 'amber',
    description: 'Phishing URL targeting BankB customers. Contains working credential harvesting form. Domain registered 3 days ago. Sent via smishing campaign.',
    evidenceReference: null,
    createdAt: '2024-02-27T10:00:00Z',
    updatedAt: '2024-02-27T10:00:00Z',
  },
  'ioc-017': {
    id: 'ioc-017',
    iocType: 'domain',
    rawValue: 'ransomware-payment.onion',
    normalizedValue: 'ransomware-payment.onion',
    contributorOrgId: 'org-certc',
    status: 'verified',
    confidenceScore: 2,
    reputationAtSubmit: 51,
    integrityHash: 'd547101277f47f507720a6f5cd02e62f139a499815a8ae53975b1b1b6ac092bf',
    blockchainTxId: '789012345678901234567890123456789012345678901234567890123456789a',
    tlpLevel: 'red',
    description: 'Tor onion domain used as ransomware payment portal. Associated with BlackCat (ALPHV) ransomware group. Multiple victim organizations confirmed.',
    evidenceReference: 'https://www.cisa.gov/advisory/2024-0201',
    createdAt: '2024-02-20T07:30:00Z',
    updatedAt: '2024-02-22T11:00:00Z',
  },
};

export const IOCS_LIST = Object.values(IOCS);

// ─── Endorsements ─────────────────────────────────────────────────────────────
// Business rule: contributor org CANNOT endorse their own IoC
// Verified IoCs each have exactly 2 endorsements from non-submitter orgs
export const ENDORSEMENTS: Endorsement[] = [
  // ioc-001 (BankA submitted) → BankB + CERTC endorsed
  { id: 'end-001a', iocId: 'ioc-001', organizationId: 'org-bankb', decision: 'endorse', reason: 'Confirmed C2 activity in our network logs as well. Corroborated.', blockchainTxId: 'ee1bcd234567890123456789012345678901234567890123456789012345ee12', createdAt: '2024-02-02T10:30:00Z' },
  { id: 'end-001b', iocId: 'ioc-001', organizationId: 'org-certc', decision: 'endorse', reason: 'Cross-referenced with national threat database. Confirmed malicious.', blockchainTxId: 'ee2cde345678901234567890123456789012345678901234567890123456ee23', createdAt: '2024-02-03T14:22:00Z' },

  // ioc-002 (BankA submitted) → BankB + CERTC endorsed
  { id: 'end-002a', iocId: 'ioc-002', organizationId: 'org-bankb', decision: 'endorse', reason: 'DNS queries to this domain observed in firewall logs.', blockchainTxId: 'ee3def456789012345678901234567890123456789012345678901234567ee34', createdAt: '2024-02-03T11:00:00Z' },
  { id: 'end-002b', iocId: 'ioc-002', organizationId: 'org-certc', decision: 'endorse', reason: 'Matches APT group TTPs in our threat intelligence feeds.', blockchainTxId: 'ee4ef5678901234567890123456789012345678901234567890123456789ee45', createdAt: '2024-02-04T09:15:00Z' },

  // ioc-003 (BankB submitted) → BankA + CERTC endorsed
  { id: 'end-003a', iocId: 'ioc-003', organizationId: 'org-banka', decision: 'endorse', reason: 'Customer complaints match this phishing URL. Blocking at perimeter.', blockchainTxId: 'ee5f678901234567890123456789012345678901234567890123456789012ee5', createdAt: '2024-02-04T15:00:00Z' },
  { id: 'end-003b', iocId: 'ioc-003', organizationId: 'org-certc', decision: 'endorse', reason: 'Added to national phishing blocklist.', blockchainTxId: 'ee678901234567890123456789012345678901234567890123456789012345ee6', createdAt: '2024-02-05T10:45:00Z' },

  // ioc-004 (BankA submitted) → BankB + CERTC endorsed
  { id: 'end-004a', iocId: 'ioc-004', organizationId: 'org-bankb', decision: 'endorse', reason: 'Same hash found in endpoint telemetry. Confirmed ransomware.', blockchainTxId: 'ee7789012345678901234567890123456789012345678901234567890123ee78', createdAt: '2024-02-05T12:00:00Z' },
  { id: 'end-004b', iocId: 'ioc-004', organizationId: 'org-certc', decision: 'endorse', reason: null, blockchainTxId: 'ee88901234567890123456789012345678901234567890123456789012345ee8', createdAt: '2024-02-06T16:00:00Z' },

  // ioc-005 (BankB submitted) → CERTC endorsed only (1/2 - pending)
  { id: 'end-005a', iocId: 'ioc-005', organizationId: 'org-certc', decision: 'endorse', reason: 'Tor exit node confirmed. Seen in multiple national incident reports.', blockchainTxId: 'ee99a01234567890123456789012345678901234567890123456789012345ee9', createdAt: '2024-02-06T08:00:00Z' },

  // ioc-006 (BankA submitted) → BankB flagged it (no endorsements, status=flagged)
  { id: 'end-006a', iocId: 'ioc-006', organizationId: 'org-bankb', decision: 'flag', reason: 'This may be a legitimate security software update domain. Needs further investigation before blocking.', blockchainTxId: null, createdAt: '2024-02-07T09:30:00Z' },

  // ioc-007 (CERTC submitted) → BankA + BankB endorsed
  { id: 'end-007a', iocId: 'ioc-007', organizationId: 'org-banka', decision: 'endorse', reason: 'URL confirmed active — sandbox detonation shows ransomware download.', blockchainTxId: 'eeab1234567890123456789012345678901234567890123456789012345678ea', createdAt: '2024-02-08T09:00:00Z' },
  { id: 'end-007b', iocId: 'ioc-007', organizationId: 'org-bankb', decision: 'endorse', reason: null, blockchainTxId: 'eebc2345678901234567890123456789012345678901234567890123456789eb', createdAt: '2024-02-08T12:10:00Z' },

  // ioc-008 (BankB submitted) → BankA rejected + CERTC rejected (confirmed false)
  { id: 'end-008a', iocId: 'ioc-008', organizationId: 'org-banka', decision: 'reject', reason: 'Verified this is a Cloudflare CDN IP. Not malicious. False positive.', blockchainTxId: 'eecd3456789012345678901234567890123456789012345678901234567890ec', createdAt: '2024-02-09T10:00:00Z' },
  { id: 'end-008b', iocId: 'ioc-008', organizationId: 'org-certc', decision: 'reject', reason: 'Cross-referenced with Cloudflare ASN. Confirmed legitimate CDN IP.', blockchainTxId: 'eede4567890123456789012345678901234567890123456789012345678901ed', createdAt: '2024-02-10T11:00:00Z' },

  // ioc-010 (BankB submitted) → BankA + CERTC endorsed
  { id: 'end-010a', iocId: 'ioc-010', organizationId: 'org-banka', decision: 'endorse', reason: 'Botnet C2 activity confirmed. Blocking at network perimeter.', blockchainTxId: 'eeef5678901234567890123456789012345678901234567890123456789012ee', createdAt: '2024-02-11T10:00:00Z' },
  { id: 'end-010b', iocId: 'ioc-010', organizationId: 'org-certc', decision: 'endorse', reason: null, blockchainTxId: 'eef067890123456789012345678901234567890123456789012345678901234f', createdAt: '2024-02-12T08:30:00Z' },

  // ioc-011 (CERTC submitted) → BankA endorsed (1/2 - pending)
  { id: 'end-011a', iocId: 'ioc-011', organizationId: 'org-banka', decision: 'endorse', reason: 'Credential stuffing traffic confirmed in our WAF logs from this IP.', blockchainTxId: 'ee1178901234567890123456789012345678901234567890123456789012311', createdAt: '2024-02-12T14:00:00Z' },

  // ioc-012 (CERTC submitted) → BankA + BankB endorsed
  { id: 'end-012a', iocId: 'ioc-012', organizationId: 'org-banka', decision: 'endorse', reason: 'Malware dropper URL confirmed active. Sample retrieved and analyzed.', blockchainTxId: 'ee1289012345678901234567890123456789012345678901234567890123412', createdAt: '2024-02-13T09:00:00Z' },
  { id: 'end-012b', iocId: 'ioc-012', organizationId: 'org-bankb', decision: 'endorse', reason: null, blockchainTxId: 'ee1390123456789012345678901234567890123456789012345678901234513', createdAt: '2024-02-14T10:20:00Z' },

  // ioc-014 (BankB submitted) → BankA + CERTC endorsed
  { id: 'end-014a', iocId: 'ioc-014', organizationId: 'org-banka', decision: 'endorse', reason: 'Emotet hash confirmed in our endpoint detection logs.', blockchainTxId: 'ee1401234567890123456789012345678901234567890123456789012345614', createdAt: '2024-02-15T11:00:00Z' },
  { id: 'end-014b', iocId: 'ioc-014', organizationId: 'org-certc', decision: 'endorse', reason: 'Matches Emotet campaign IOC list from national CERT.', blockchainTxId: 'ee1512345678901234567890123456789012345678901234567890123456715', createdAt: '2024-02-16T09:45:00Z' },

  // ioc-017 (CERTC submitted) → BankA + BankB endorsed
  { id: 'end-017a', iocId: 'ioc-017', organizationId: 'org-banka', decision: 'endorse', reason: 'BlackCat payment portal confirmed. Seen in incident response engagement.', blockchainTxId: 'ee1623456789012345678901234567890123456789012345678901234567816', createdAt: '2024-02-21T09:00:00Z' },
  { id: 'end-017b', iocId: 'ioc-017', organizationId: 'org-bankb', decision: 'endorse', reason: null, blockchainTxId: 'ee1734567890123456789012345678901234567890123456789012345678917', createdAt: '2024-02-22T11:00:00Z' },
];

// ─── Helper: get endorsements for an IoC ─────────────────────────────────────
export function getEndorsementsForIoc(iocId: string): Endorsement[] {
  return ENDORSEMENTS.filter(e => e.iocId === iocId);
}

export function getEndorseCount(iocId: string): number {
  return ENDORSEMENTS.filter(e => e.iocId === iocId && e.decision === 'endorse').length;
}

// ─── Reputation Events ────────────────────────────────────────────────────────
// BankA: +1 (ioc-001 verified 50→51), +1 (ioc-002 verified 51→52). Current=52.
// BankB: +1 (ioc-003 verified 50→51), +1 (ioc-010 verified 51→52), -3 (ioc-008 false 52→49). Current=49.
// CERTC: +1 (ioc-007 verified 50→51), +1 (ioc-012 verified 51→52). Current=52.
export const REPUTATION_EVENTS: ReputationEvent[] = [
  // BankA
  {
    id: 're-001', organizationId: 'org-banka', eventType: 'valid_submission',
    scoreDelta: 1, relatedIocId: 'ioc-001', relatedIocValue: '45.83.64.1 (IP)',
    previousScore: 50, newScore: 51,
    blockchainTxId: 'rr1a2b3c4d5e6f789012345678901234567890123456789012345678901234ra1',
    createdAt: '2024-02-03T14:22:00Z',
  },
  {
    id: 're-002', organizationId: 'org-banka', eventType: 'valid_submission',
    scoreDelta: 1, relatedIocId: 'ioc-002', relatedIocValue: 'c2-server.ru (domain)',
    previousScore: 51, newScore: 52,
    blockchainTxId: 'rr2b3c4d5e6f7890123456789012345678901234567890123456789012345rb2',
    createdAt: '2024-02-04T09:15:00Z',
  },
  // BankB
  {
    id: 're-003', organizationId: 'org-bankb', eventType: 'valid_submission',
    scoreDelta: 1, relatedIocId: 'ioc-003', relatedIocValue: 'phishing-portal.net (URL)',
    previousScore: 50, newScore: 51,
    blockchainTxId: 'rr3c4d5e6f789012345678901234567890123456789012345678901234567rc3',
    createdAt: '2024-02-05T10:45:00Z',
  },
  {
    id: 're-004', organizationId: 'org-bankb', eventType: 'valid_submission',
    scoreDelta: 1, relatedIocId: 'ioc-010', relatedIocValue: 'botnet-c2.onion (domain)',
    previousScore: 51, newScore: 52,
    blockchainTxId: 'rr4d5e6f7890123456789012345678901234567890123456789012345678rd4',
    createdAt: '2024-02-12T08:30:00Z',
  },
  {
    id: 're-005', organizationId: 'org-bankb', eventType: 'false_submission',
    scoreDelta: -3, relatedIocId: 'ioc-008', relatedIocValue: '91.121.87.46 (IP)',
    previousScore: 52, newScore: 49,
    blockchainTxId: 'rr5e6f789012345678901234567890123456789012345678901234567890re5',
    createdAt: '2024-02-10T11:00:00Z',
  },
  // CERTC
  {
    id: 're-006', organizationId: 'org-certc', eventType: 'valid_submission',
    scoreDelta: 1, relatedIocId: 'ioc-007', relatedIocValue: 'malware-download.io (URL)',
    previousScore: 50, newScore: 51,
    blockchainTxId: 'rr6f789012345678901234567890123456789012345678901234567890123rf6',
    createdAt: '2024-02-08T12:10:00Z',
  },
  {
    id: 're-007', organizationId: 'org-certc', eventType: 'valid_submission',
    scoreDelta: 1, relatedIocId: 'ioc-012', relatedIocValue: 'dropper.xyz/stage2 (URL)',
    previousScore: 51, newScore: 52,
    blockchainTxId: 'rr7g890123456789012345678901234567890123456789012345678901234rg7',
    createdAt: '2024-02-14T10:20:00Z',
  },
];

const rawAuditLog: AuditEntry[] = [
  // Organization registrations
  { id: 'aud-r1', actorOrgId: 'org-banka', actorOrgName: 'BankA', actorUserId: 'user-banka-admin', actorUsername: 'banka_admin', action: 'register_org', objectId: 'org-banka', objectValue: 'BankA', blockchainTxId: 'aabc1234567890123456789012345678901234567890123456789012345678aa', result: 'Organization registered and authorized', createdAt: '2024-01-15T09:05:00Z' },
  { id: 'aud-r2', actorOrgId: 'org-bankb', actorOrgName: 'BankB', actorUserId: 'user-bankb-analyst', actorUsername: 'bankb_analyst', action: 'register_org', objectId: 'org-bankb', objectValue: 'BankB', blockchainTxId: 'bbcd2345678901234567890123456789012345678901234567890123456789bb', result: 'Organization registered and authorized', createdAt: '2024-01-15T09:10:00Z' },
  { id: 'aud-r3', actorOrgId: 'org-certc', actorOrgName: 'CERTC', actorUserId: 'user-certc-analyst', actorUsername: 'certc_analyst', action: 'register_org', objectId: 'org-certc', objectValue: 'CERTC', blockchainTxId: 'ccde3456789012345678901234567890123456789012345678901234567890cc', result: 'Organization registered and authorized', createdAt: '2024-01-15T09:15:00Z' },
  // IoC Submissions
  { id: 'aud-s1', actorOrgId: 'org-banka', actorOrgName: 'BankA', actorUserId: 'user-banka-analyst', actorUsername: 'banka_analyst', action: 'submit_ioc', objectId: 'ioc-001', objectValue: '45.83.64.1 (ip)', blockchainTxId: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef012345', result: 'IoC submitted — status: pending', createdAt: '2024-02-01T09:00:00Z' },
  { id: 'aud-s2', actorOrgId: 'org-banka', actorOrgName: 'BankA', actorUserId: 'user-banka-analyst', actorUsername: 'banka_analyst', action: 'submit_ioc', objectId: 'ioc-002', objectValue: 'c2-server.ru (domain)', blockchainTxId: 'b2c3d4e5f6780123456789012345678901bcdef2345678901234567890abc123', result: 'IoC submitted — status: pending', createdAt: '2024-02-02T11:30:00Z' },
  { id: 'aud-s3', actorOrgId: 'org-bankb', actorOrgName: 'BankB', actorUserId: 'user-bankb-analyst', actorUsername: 'bankb_analyst', action: 'submit_ioc', objectId: 'ioc-003', objectValue: 'phishing-portal.net (url)', blockchainTxId: 'c3d4e5f67890123456789012345678901cdef3456789012345678901234cd456', result: 'IoC submitted — status: pending', createdAt: '2024-02-03T14:00:00Z' },
  { id: 'aud-s8', actorOrgId: 'org-bankb', actorOrgName: 'BankB', actorUserId: 'user-bankb-analyst', actorUsername: 'bankb_analyst', action: 'submit_ioc', objectId: 'ioc-008', objectValue: '91.121.87.46 (ip)', blockchainTxId: '78901234567890123456789012345678901234567890123456789012345678ab', result: 'IoC submitted — status: pending', createdAt: '2024-02-08T15:30:00Z' },
  { id: 'aud-s15', actorOrgId: 'org-banka', actorOrgName: 'BankA', actorUserId: 'user-banka-analyst', actorUsername: 'banka_analyst', action: 'submit_ioc', objectId: 'ioc-015', objectValue: '203.0.113.42 (ip)', blockchainTxId: 'e56f789012345678901234567890123456789012345678901234567890ef5678', result: 'IoC submitted — status: pending', createdAt: '2024-02-28T14:30:00Z' },
  // Endorsements
  { id: 'aud-e1a', actorOrgId: 'org-bankb', actorOrgName: 'BankB', actorUserId: 'user-bankb-reviewer', actorUsername: 'bankb_reviewer', action: 'endorse_ioc', objectId: 'ioc-001', objectValue: '45.83.64.1 (ip)', blockchainTxId: 'ee1bcd234567890123456789012345678901234567890123456789012345ee12', result: 'Endorsed — 1/2 endorsements', createdAt: '2024-02-02T10:30:00Z' },
  { id: 'aud-e1b', actorOrgId: 'org-certc', actorOrgName: 'CERTC', actorUserId: 'user-certc-reviewer', actorUsername: 'certc_reviewer', action: 'endorse_ioc', objectId: 'ioc-001', objectValue: '45.83.64.1 (ip)', blockchainTxId: 'ee2cde345678901234567890123456789012345678901234567890123456ee23', result: 'Endorsed — 2/2 endorsements', createdAt: '2024-02-03T14:22:00Z' },
  { id: 'aud-v1', actorOrgId: 'org-banka', actorOrgName: 'BankA', actorUserId: null, actorUsername: null, action: 'verify_ioc', objectId: 'ioc-001', objectValue: '45.83.64.1 (ip)', blockchainTxId: 'vv1234567890abcdef1234567890abcdef1234567890abcdef1234567890vv12', result: 'IoC verified — threshold reached (2/2)', createdAt: '2024-02-03T14:22:01Z' },
  { id: 'aud-rep1', actorOrgId: 'org-banka', actorOrgName: 'BankA', actorUserId: null, actorUsername: null, action: 'update_reputation', objectId: 'ioc-001', objectValue: '45.83.64.1', blockchainTxId: 'rr1a2b3c4d5e6f789012345678901234567890123456789012345678901234ra1', result: 'BankA reputation: 50 → 51 (+1)', createdAt: '2024-02-03T14:22:02Z' },
  { id: 'aud-rej8a', actorOrgId: 'org-banka', actorOrgName: 'BankA', actorUserId: 'user-banka-reviewer', actorUsername: 'banka_admin', action: 'reject_ioc', objectId: 'ioc-008', objectValue: '91.121.87.46 (ip)', blockchainTxId: 'eecd3456789012345678901234567890123456789012345678901234567890ec', result: 'Rejected — confirmed false positive', createdAt: '2024-02-09T10:00:00Z' },
  { id: 'aud-rej8b', actorOrgId: 'org-certc', actorOrgName: 'CERTC', actorUserId: 'user-certc-reviewer', actorUsername: 'certc_reviewer', action: 'reject_ioc', objectId: 'ioc-008', objectValue: '91.121.87.46 (ip)', blockchainTxId: 'eede4567890123456789012345678901234567890123456789012345678901ed', result: 'Rejected — confirmed false positive', createdAt: '2024-02-10T11:00:00Z' },
  { id: 'aud-rep5', actorOrgId: 'org-bankb', actorOrgName: 'BankB', actorUserId: null, actorUsername: null, action: 'update_reputation', objectId: 'ioc-008', objectValue: '91.121.87.46', blockchainTxId: 'rr5e6f789012345678901234567890123456789012345678901234567890re5', result: 'BankB reputation: 52 → 49 (−3)', createdAt: '2024-02-10T11:00:01Z' },
  // Integrity checks
  { id: 'aud-i1', actorOrgId: 'org-certc', actorOrgName: 'CERTC', actorUserId: 'user-certc-reviewer', actorUsername: 'certc_reviewer', action: 'integrity_check', objectId: 'ioc-001', objectValue: '45.83.64.1 (ip)', blockchainTxId: null, result: 'PASS — on-chain hash matches current record', createdAt: '2024-02-15T10:00:00Z' },
  { id: 'aud-i8', actorOrgId: 'org-banka', actorOrgName: 'BankA', actorUserId: 'user-banka-admin', actorUsername: 'banka_admin', action: 'integrity_check', objectId: 'ioc-008', objectValue: '91.121.87.46 (ip)', blockchainTxId: null, result: 'FAIL — BLOCKCHAIN INTEGRITY CHECK FAILED: hash mismatch detected', createdAt: '2024-02-16T14:30:00Z' },
];

export const AUDIT_LOG: AuditEntry[] = [...rawAuditLog].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Get all IoCs accessible to a given org */
export function getIocsForOrg(_orgId: string): Ioc[] {
  // In MVP: all verified IoCs + pending ones visible to all participants
  return IOCS_LIST;
}

/** Get pending IoCs that a given org can endorse (not their own, not already endorsed) */
export function getPendingForEndorsement(orgId: string): Ioc[] {
  return IOCS_LIST.filter(ioc => {
    if (ioc.status !== 'pending') return false;
    if (ioc.contributorOrgId === orgId) return false; // self-endorsement not allowed
    const alreadyEndorsed = ENDORSEMENTS.some(
      e => e.iocId === ioc.id && e.organizationId === orgId
    );
    return !alreadyEndorsed;
  });
}

/** Get organization stats */
export function getOrgStats(orgId: string) {
  const submitted = IOCS_LIST.filter(i => i.contributorOrgId === orgId);
  const verified = submitted.filter(i => i.status === 'verified');
  const pending = submitted.filter(i => i.status === 'pending');
  const rejected = submitted.filter(i => i.status === 'rejected');
  const pendingEndorse = getPendingForEndorsement(orgId);
  const repEvents = REPUTATION_EVENTS.filter(r => r.organizationId === orgId);
  return { submitted, verified, pending, rejected, pendingEndorse, repEvents };
}

/** Get reputation events for an org */
export function getReputationHistory(orgId: string): ReputationEvent[] {
  return REPUTATION_EVENTS.filter(r => r.organizationId === orgId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Get audit log filtered by org (actor or object) */
export function getAuditForOrg(orgId: string): AuditEntry[] {
  return AUDIT_LOG.filter(a => a.actorOrgId === orgId || IOCS[a.objectId ?? '']?.contributorOrgId === orgId);
}

/** All-org audit log for the integrity screen */
export function getAllAuditLog(): AuditEntry[] {
  return AUDIT_LOG;
}
