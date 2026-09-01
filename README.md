# ThreatTrust — Decentralized Cyber Threat Intelligence Platform

> **Detect Once. Defend Everywhere.**

ThreatTrust is a decentralized trust layer that enables participating enterprises, banks, and national CERTs to validate, endorse, and securely share cyber-threat intelligence (IoCs) through a tamper-evident blockchain network.

---

## Table of Contents

1. [Why Blockchain?](#why-blockchain)
2. [High-Level Architecture](#high-level-architecture)
3. [Technology Stack](#technology-stack)
4. [Repository Structure](#repository-structure)
5. [On-Chain vs Off-Chain Data Responsibilities](#on-chain-vs-off-chain-data-responsibilities)
6. [Consortium Organizations & Test Accounts](#consortium-organizations--test-accounts)
7. [Business Rules & Cryptographic Specifications](#business-rules--cryptographic-specifications)
8. [Local Development & Docker Setup](#local-development--docker-setup)
9. [Automated Test Suite](#automated-test-suite)
10. [Security & Hardening Guidelines](#security--hardening-guidelines)

---

## Why Blockchain?

In traditional threat sharing platforms (e.g., centralized MISP instances or single-vendor TI feeds):
- **Central Point of Failure & Trust**: A central administrator can unilaterally tamper with, delete, or fabricate threat intelligence and contributor attribution.
- **Attribution & Accountability**: Organizations lack verifiable cryptographic proof of who reported an indicator, when it was observed, and who vetted it.
- **Unverifiable Reputation**: In a centralized database, reputation scores can be arbitrarily inflated or manipulated without an audit trail.

### ThreatTrust Blockchain Value Proposition:
1. **Tamper-Evident Shared Record**: Hyperledger Fabric provides an append-only distributed ledger across independent organizations (BankA, BankB, CERTC). No single bank or agency can alter historical submissions.
2. **Cryptographic State Anchoring**: Every IoC committed to the network anchors a deterministic SHA-256 integrity hash on the Fabric ledger:
   $$\text{SHA256}(\text{ioc\_id} \mid \text{ioc\_type} \mid \text{normalized\_value} \mid \text{contributor\_org\_id} \mid \text{created\_at\_unix})$$
   Any subsequent off-chain database modification (accidental or malicious) is instantly flagged as **FAIL / TAMPER DETECTED**.
3. **Consensus-Driven Verification**: State transitions from `pending` to `verified` require **2 independent peer endorsements** via smart contract execution (`threattrust_cc`). Submitter nodes are strictly prohibited from self-endorsing.
4. **Transparent Reputation Ledger**: Reputation mutation events ($+1$ on verification, $-3$ on false submissions) are recorded in an immutable ledger stream.

---

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           Next.js 14 Web Interface                               │
│  [Operations Dashboard] [Threat Feed] [Submit IoC] [Endorse Panel] [Reputation]  │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │ REST API (/api/v1) + JWT Bearer
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      Node.js / Express / TypeScript Backend                       │
│  ├── Auth & RBAC Middleware (admin, contributor, reviewer)                        │
│  ├── Normalization Engine (IPv4/IPv6, URL Tracking Stripping, Domain www Strip)   │
│  ├── Format Validation Engine (IP, URL, Domain, Hash)                             │
│  ├── Deterministic SHA-256 Integrity Engine                                       │
│  └── Reputation & 2/2 Consensus Logic                                             │
└──────────────────────┬─────────────────────────────────────┬──────────────────────┘
                       │                                     │
           Prisma ORM  ▼                                     ▼  Fabric Gateway Client
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│           PostgreSQL Database         │   │      Hyperledger Fabric 2.5 Node      │
│  ├── Full raw indicator data          │   │  Channel: cti-channel                 │
│  ├── Incident descriptions            │   │  Chaincode: threattrust_cc (Go)       │
│  ├── External evidence URLs           │   │  ├── SubmitIoC (Anchors SHA-256)      │
│  ├── User credentials (bcrypt)        │   │  ├── EndorseIoC (Consensus Counter)   │
│  └── Full read/search index           │   │  └── UpdateReputation (Ledger Events) │
└───────────────────────────────────────┘   └───────────────────────────────────────┘
```

---

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Backend API**: Node.js, Express, TypeScript, Zod (request validation), JSON Web Tokens (JWT), bcrypt
- **Data Layer**: PostgreSQL 16, Prisma ORM, Embedded Data Fallback Store
- **Blockchain Core**: Hyperledger Fabric 2.5, Raft Consensus Orderer, Go Smart Contract (`fabric-contract-api-go`), Fabric Gateway SDK (`@hyperledger/fabric-gateway`, `@grpc/grpc-js`)

---

## Repository Structure

```
ThreatTrust/
├── apps/
│   ├── backend/                      # Node.js + Express + TypeScript API server
│   │   ├── src/
│   │   │   ├── config/               # Environment & threshold configuration
│   │   │   ├── db/                   # Prisma Client & embedded fallback store
│   │   │   ├── middlewares/          # JWT auth, RBAC guards, Zod validation, error handler
│   │   │   ├── routes/               # API routes (/auth, /orgs, /iocs, /audit)
│   │   │   ├── services/             # Normalization, validation, integrity, reputation, ioc, fabric
│   │   │   └── tests/                # Automated unit, integration, E2E, and acceptance tests
│   │   └── package.json
│   └── frontend/                     # Next.js 14 Web Application
│       ├── src/
│       │   ├── app/                  # App router pages (dashboard, threats, submit, endorse, audit)
│       │   ├── components/           # Sidebar, StatusBadge, KPI cards
│       │   └── lib/                  # AuthContext, API client, types, mock data
│       └── package.json
├── blockchain/
│   ├── chaincode/                    # Hyperledger Fabric Go Smart Contract (threattrust_cc)
│   │   ├── main.go                   # Smart contract lifecycle methods & duplicate checks
│   │   └── go.mod
│   └── network/                      # Fabric 2.5 infrastructure
│       ├── configtx.yaml             # Channel & genesis block definition for cti-channel
│       ├── crypto-config.yaml        # Cryptographic MSP identities for 3 Orgs
│       ├── docker-compose-net.yaml   # Orderer, 3 Peers (BankA, BankB, CERTC), CLI
│       ├── connection-banka.json     # Gateway connection profiles
│       ├── connection-bankb.json
│       ├── connection-certc.json
│       └── scripts/                  # network-up, network-down, create-channel, deploy-cc (.sh / .ps1)
├── db/
│   └── migrations/                   # SQL migration scripts
├── docker-compose.yml                # Unified Docker Compose configuration
└── README.md
```

---

## On-Chain vs Off-Chain Data Responsibilities

| Data Field | Hyperledger Fabric Ledger | PostgreSQL Application Database |
|---|---|---|
| **Authoritative Role** | Authoritative for trust state & immutable commitments | Authoritative for rich search, full-text indexes, UI read models |
| **IoC Identifiers** | `ioc_id`, `ioc_type`, `normalized_value` | `id`, `ioc_type`, `normalized_value`, `raw_value` |
| **Integrity Anchor** | SHA-256 canonical commitment hash | SHA-256 hash & verification status |
| **Consensus & State** | Status (`pending`, `verified`), `confidence_score` (0-2) | Status, confidence score, full endorsement history |
| **Reputation** | Immutable mutation log, score updates | Current scores, user-facing reputation views |
| **Sensitive Metadata** | **Excluded** for privacy / GDPR compliance | Description, evidence URLs, internal SOC notes |
| **User Identity** | MSP ID (`BankAMSP`, `BankBMSP`, `CERTCMSP`) | User ID, username, bcrypt password hash, role |

---

## Consortium Organizations & Test Accounts

| Organization | Org Type | MSP ID | Username | Role | Password |
|---|---|---|---|---|---|
| **BankA** | Commercial Bank | `BankAMSP` | `banka_admin` | `admin` | `banka_admin_pass` |
| **BankA** | Commercial Bank | `BankAMSP` | `banka_analyst` | `contributor` | `banka_analyst_pass` |
| **BankB** | Commercial Bank | `BankBMSP` | `bankb_analyst` | `contributor` | `bankb_analyst_pass` |
| **BankB** | Commercial Bank | `BankBMSP` | `bankb_reviewer` | `reviewer` | `bankb_reviewer_pass` |
| **CERTC** | National CERT | `CERTCMSP` | `certc_analyst` | `contributor` | `certc_analyst_pass` |
| **CERTC** | National CERT | `CERTCMSP` | `certc_reviewer` | `reviewer` | `certc_reviewer_pass` |

---

## Business Rules & Cryptographic Specifications

1. **URL Normalization**:
   - Lowercases scheme and host.
   - Normalizes path slashes.
   - Preserves meaningful query parameters (`id`, `session`, `token`, etc.) in deterministic sorted order.
   - Strips telemetry tracking parameters (`utm_*`, `fbclid`, `gclid`, `msclkid`, `_ga`, etc.).
2. **Domain Normalization & Deduplication Policy**:
   - Lowercases domain, removes root dot, and strips `www.` (`www.c2.ru` $\rightarrow$ `c2.ru`).
3. **IP Normalization**:
   - Strips leading zeros per octet (`185.010.020.030` $\rightarrow$ `185.10.20.30`).
4. **File Hash Normalization**:
   - Converts MD5, SHA-1, SHA-256 strings to lowercase hexadecimal; rejects invalid lengths and non-hex characters.
5. **Deduplication Identity**:
   - Compound key: `(ioc_type, normalized_value)`. Re-submitting an existing normalized IoC returns the existing record and routes to endorsement without creating a second record.
6. **Peer Consensus Rules**:
   - **Anti-Sybil Lock**: Contributor organization cannot endorse its own submission.
   - One review per organization per indicator.
   - **2/2 Threshold**: Exactly 2 independent peer endorsements transition status to `verified`.
7. **Reputation Rules**:
   - Genesis: **50**.
   - Submission alone: **+0**.
   - Verified contribution: **+1** (awarded only upon reaching 2/2 consensus).
   - Confirmed false contribution: **-3**.
   - Restriction: Score **$< 30$** locks submission privileges.

---

## Local Development & Docker Setup

### Prerequisites
- Node.js $\ge 18$
- npm $\ge 9$
- Docker & Docker Compose (Optional for containerized Fabric network)
- Go $\ge 1.20$ (Optional for local chaincode compilation)

### Startup Sequence

#### 1. Start Infrastructure & Hyperledger Fabric Network
```bash
# Start PostgreSQL:
docker compose up -d postgres

# Start Hyperledger Fabric 2.5 Consortium (Orderer, BankA, BankB, CERTC):
# Option A: PowerShell
.\blockchain\network\scripts\network-up.ps1

# Option B: Direct Docker Compose
docker compose -f blockchain/network/docker-compose-net.yaml up -d
```

#### 2. Start Backend API Server
```bash
cd apps/backend
npm install
npm run dev
# Server starts on http://localhost:4000
# Health check: http://localhost:4000/health
```

#### 3. Start Frontend Web Application
```bash
cd apps/frontend
npm install
npm run dev
# UI accessible on http://localhost:3000
```

---

## Operating Modes: Real Fabric vs Fabric Unavailable

ThreatTrust enforces absolute transparency regarding blockchain connectivity:

### 1. REAL FABRIC MODE (Connected Network)
- **Active when**: Docker Fabric containers (Orderer + Peers) are running and reachable via gRPC on `localhost:7051`.
- **Behavior**:
  - Uses `@hyperledger/fabric-gateway` client SDK to connect to `cti-channel` and smart contract `threattrust_cc`.
  - Submits transaction proposals (`SubmitIoC`, `EndorseIoC`, `UpdateReputation`).
  - Returns the **real 64-character transaction ID** committed and confirmed by the Fabric ledger.
  - Queries actual on-chain ledger state for integrity and threat history.
  - Frontend displays confirmed on-chain transaction hashes.

### 2. FABRIC UNAVAILABLE MODE (Offline / Non-Containerized)
- **Active when**: Docker/Fabric daemon is not running or peer gRPC endpoint is unreachable.
- **Behavior**:
  - Explicitly returns status `FABRIC_UNAVAILABLE`.
  - Sets `txId: null` across all service responses.
  - **Does NOT generate fake Fabric transaction IDs.**
  - **Does NOT label cryptographic SHA-256 hashes as transaction IDs.**
  - Off-chain application records store `blockchainTxId: null`.
  - Frontend clearly displays **"Fabric Network Offline (Local Store Mode)"** instead of falsely claiming blockchain confirmation.
  - Integrity verification engine verifies database state against application-stored hash and reports `fabricConnected: false`.

---

## Automated Test Suite

ThreatTrust contains **139 automated test assertions** across 6 comprehensive test suites spanning unit tests, API integration tests, E2E lifecycle workflows, Hyperledger Fabric integration tests, the 26-step final acceptance test suite, and the fallback transparency suite.

Run all tests via npm:
```bash
cd apps/backend
npm test
```

### Test Breakdown:
1. `src/tests/backend.test.ts`: 43 assertions (Normalization, Validation, Duplicate rules, Hashing, Reputation).
2. `src/tests/api.test.ts`: 7 assertions (Health endpoint, JWT Auth, RBAC Role Guards, Zod validation).
3. `src/tests/e2e_workflow.test.ts`: 31 assertions (Consortium login, submit, anti-sybil block, 2/2 threshold verification, rep delta).
4. `src/tests/fabric.test.ts`: 22 assertions (Fabric 2.5 topology, Go chaincode methods, Gateway proposals).
5. `src/tests/acceptance.test.ts`: 26 assertions (Complete 26-step final acceptance lifecycle verification).
6. `src/tests/fallback.test.ts`: 10 assertions (Real Fabric vs Fabric Unavailable mode transparency, zero fake txIds).

---

## Security & Hardening Guidelines

- **Zero Client Trust on Identity**: All identity, role, and organization parameters are extracted directly from cryptographically signed JWT tokens on the server; client-supplied organization IDs in request bodies are ignored or rejected.
- **Zero Fake Blockchain Claims**: When blockchain is offline, transaction IDs are strictly `null` and status is transparently marked `FABRIC_UNAVAILABLE`.
- **SQL & Query Injection Immune**: All database queries utilize parameterized Prisma queries and strict TypeScript types.
- **Credential Storage**: Passwords are encrypted with `bcrypt` using 10 salt rounds; plaintext passwords are never stored or logged.
- **Information Leakage Prevention**: Production error responses mask internal database and ledger stack traces.
- **Anti-Replay & Idempotency**: Duplicate reviews and duplicate submissions cannot inflate consensus scores or award duplicate reputation points.
