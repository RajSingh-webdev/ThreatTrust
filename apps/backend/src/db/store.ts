import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import {
  OrgType,
  OrgStatus,
  UserRole,
  UserStatus,
  IocType,
  IocStatus,
  TlpLevel,
  EndorsementDecision,
  ReputationEventType,
  AuditAction,
} from "../types";

export interface OrganizationRecord {
  id: string;
  name: string;
  orgType: OrgType;
  status: OrgStatus;
  fabricMspId: string;
  reputationScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRecord {
  id: string;
  organizationId: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IocRecord {
  id: string;
  iocType: IocType;
  rawValue: string;
  normalizedValue: string;
  contributorOrgId: string;
  status: IocStatus;
  confidenceScore: number;
  reputationAtSubmit: number;
  integrityHash: string | null;
  blockchainTxId: string | null;
  tlpLevel: TlpLevel;
  description: string | null;
  evidenceReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EndorsementRecord {
  id: string;
  iocId: string;
  organizationId: string;
  decision: EndorsementDecision;
  reason: string | null;
  blockchainTxId: string | null;
  createdAt: Date;
}

export interface ReputationEventRecord {
  id: string;
  organizationId: string;
  eventType: ReputationEventType;
  scoreDelta: number;
  relatedIocId: string | null;
  previousScore: number;
  newScore: number;
  blockchainTxId: string | null;
  createdAt: Date;
}

export interface AuditLogRecord {
  id: string;
  actorOrgId: string;
  actorUserId: string | null;
  action: AuditAction;
  objectId: string | null;
  result: string | null;
  blockchainTxId: string | null;
  createdAt: Date;
}

/**
 * Universal In-Memory / Fallback Store
 * Pre-seeded with exact ThreatTrust Consortium genesis entities.
 */
class MemoryDataStore {
  public organizations: OrganizationRecord[] = [];
  public users: UserRecord[] = [];
  public iocs: IocRecord[] = [];
  public endorsements: EndorsementRecord[] = [];
  public reputationEvents: ReputationEventRecord[] = [];
  public auditLogs: AuditLogRecord[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    const now = new Date("2024-01-15T09:00:00Z");

    // 1. Seed 3 Organizations (Genesis reputation = 50)
    const bankA: OrganizationRecord = {
      id: "org-banka",
      name: "BankA",
      orgType: "bank",
      status: "active",
      fabricMspId: "BankAMSP",
      reputationScore: 50,
      createdAt: now,
      updatedAt: now,
    };

    const bankB: OrganizationRecord = {
      id: "org-bankb",
      name: "BankB",
      orgType: "bank",
      status: "active",
      fabricMspId: "BankBMSP",
      reputationScore: 50,
      createdAt: now,
      updatedAt: now,
    };

    const certC: OrganizationRecord = {
      id: "org-certc",
      name: "CERTC",
      orgType: "cert",
      status: "active",
      fabricMspId: "CERTCMSP",
      reputationScore: 50,
      createdAt: now,
      updatedAt: now,
    };

    this.organizations = [bankA, bankB, certC];

    // 2. Seed 6 Users with bcrypt hashes
    // Pre-calculated bcrypt hashes for rounds=10:
    // 'banka_admin_pass' -> $2b$10$97s5jRjP4wQjB6E8s0K2s.mH1G1bTf3W8Lz1zVn7jM6fKxPqRtUyG
    // We compute live or use standard sync hash
    const passHash = (pass: string) => bcrypt.hashSync(pass, 10);

    this.users = [
      {
        id: "user-banka-admin",
        organizationId: "org-banka",
        username: "banka_admin",
        passwordHash: passHash("banka_admin_pass"),
        role: "admin",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-banka-analyst",
        organizationId: "org-banka",
        username: "banka_analyst",
        passwordHash: passHash("banka_analyst_pass"),
        role: "contributor",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-bankb-analyst",
        organizationId: "org-bankb",
        username: "bankb_analyst",
        passwordHash: passHash("bankb_analyst_pass"),
        role: "contributor",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-bankb-reviewer",
        organizationId: "org-bankb",
        username: "bankb_reviewer",
        passwordHash: passHash("bankb_reviewer_pass"),
        role: "reviewer",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-certc-analyst",
        organizationId: "org-certc",
        username: "certc_analyst",
        passwordHash: passHash("certc_analyst_pass"),
        role: "contributor",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-certc-reviewer",
        organizationId: "org-certc",
        username: "certc_reviewer",
        passwordHash: passHash("certc_reviewer_pass"),
        role: "reviewer",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 3. Seed initial IoCs
    const ioc1: IocRecord = {
      id: "ioc-001",
      iocType: "ip",
      rawValue: "45.83.64.1",
      normalizedValue: "45.83.64.1",
      contributorOrgId: "org-banka",
      status: "verified",
      confidenceScore: 2,
      reputationAtSubmit: 50,
      integrityHash: "93be512ca089698eb16675f96a46eb8eb7e4b623733c8da1f4ef77ea87a5bf00",
      blockchainTxId: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef012345",
      tlpLevel: "amber",
      description: "Confirmed C2 server for Cobalt Strike beacon observed in bank network intrusion.",
      evidenceReference: "https://internal.banka.corp/soc/incidents/2024-001",
      createdAt: new Date("2024-02-01T09:00:00Z"),
      updatedAt: new Date("2024-02-03T14:22:00Z"),
    };

    const ioc2: IocRecord = {
      id: "ioc-002",
      iocType: "domain",
      rawValue: "c2-server.ru",
      normalizedValue: "c2-server.ru",
      contributorOrgId: "org-banka",
      status: "verified",
      confidenceScore: 2,
      reputationAtSubmit: 51,
      integrityHash: "ca1c446ac348e79e41416fdaf53f21284216fbbb34ed7fb5f2d57420316b35c5",
      blockchainTxId: "b2c3d4e5f6780123456789012345678901bcdef2345678901234567890abc123",
      tlpLevel: "red",
      description: "Command and control domain used by APT group. DGA-based subdomain generation.",
      evidenceReference: null,
      createdAt: new Date("2024-02-02T11:30:00Z"),
      updatedAt: new Date("2024-02-04T09:15:00Z"),
    };

    const ioc3: IocRecord = {
      id: "ioc-003",
      iocType: "url",
      rawValue: "http://phishing-portal.net/secure/login",
      normalizedValue: "http://phishing-portal.net/secure/login",
      contributorOrgId: "org-bankb",
      status: "verified",
      confidenceScore: 2,
      reputationAtSubmit: 50,
      integrityHash: "ea0a86d69d62953b0377817c3886f8a4d29b156b903cc97390e66c41dd79047a",
      blockchainTxId: "c3d4e5f67890123456789012345678901cdef3456789012345678901234cd456",
      tlpLevel: "amber",
      description: "Active phishing page mimicking customer banking portal.",
      evidenceReference: "https://urlscan.io/result/abc123",
      createdAt: new Date("2024-02-03T14:00:00Z"),
      updatedAt: new Date("2024-02-05T10:45:00Z"),
    };

    const ioc8: IocRecord = {
      id: "ioc-008",
      iocType: "ip",
      rawValue: "91.121.87.46",
      normalizedValue: "91.121.87.46",
      contributorOrgId: "org-bankb",
      status: "rejected",
      confidenceScore: 0,
      reputationAtSubmit: 50,
      integrityHash: "3da18efc8cb5dd1d456cbd0c3e8adc204c85be509c8f83b020fff8d81c5af18d",
      blockchainTxId: "78901234567890123456789012345678901234567890123456789012345678ab",
      tlpLevel: "amber",
      description: "Submitted as C2 server. Confirmed false positive: CDN IP.",
      evidenceReference: null,
      createdAt: new Date("2024-02-08T15:30:00Z"),
      updatedAt: new Date("2024-02-10T11:00:00Z"),
    };

    this.iocs = [ioc1, ioc2, ioc3, ioc8];

    // 4. Seed endorsements
    this.endorsements = [
      {
        id: "end-001a",
        iocId: "ioc-001",
        organizationId: "org-bankb",
        decision: "endorse",
        reason: "Confirmed in internal logs",
        blockchainTxId: "tx_end_1a",
        createdAt: new Date("2024-02-02T10:30:00Z"),
      },
      {
        id: "end-001b",
        iocId: "ioc-001",
        organizationId: "org-certc",
        decision: "endorse",
        reason: "National DB verified",
        blockchainTxId: "tx_end_1b",
        createdAt: new Date("2024-02-03T14:22:00Z"),
      },
    ];

    // BankA gained +2 (to 52), BankB 50+1-3 -> 48, CERTC 50
    bankA.reputationScore = 52;
    bankB.reputationScore = 48;
    certC.reputationScore = 50;
  }
}

export const memoryStore = new MemoryDataStore();
