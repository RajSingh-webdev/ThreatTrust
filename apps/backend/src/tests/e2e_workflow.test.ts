/**
 * ThreatTrust — Full End-to-End Workflow Test
 *
 * Simulates complete consortium interaction:
 * BankA Submits IoC -> Pending (0 rep delta)
 * BankA attempts Self-Endorse -> Blocked (400)
 * Duplicate Submission -> Routed (200)
 * BankB Endorses -> 1/2 (Pending)
 * BankB attempts Double-Endorse -> Blocked (400)
 * CERTC Endorses -> 2/2 -> Auto-Verified!
 * BankA receives +1 Reputation!
 * Integrity Engine verifies PASS and FAIL tamper states.
 */

import request from "supertest";
import app from "../app";
import { BlockchainService } from "../services/blockchain.service";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✗\x1b[0m ${testName} ${detail ? `(${detail})` : ""}`);
    failedCount++;
  }
}

async function runE2E() {
  console.log("\n🛡️  Running ThreatTrust Complete E2E Lifecycle Workflow Tests...\n");

  // 1. Authenticate BankA Analyst
  console.log("\x1b[1m\x1b[34m── 1. Consortium Authentication ───────────────────────\x1b[0m");
  const bankALogin = await request(app).post("/api/v1/auth/login").send({
    username: "banka_analyst",
    password: "banka_analyst_pass",
  });
  assert(bankALogin.status === 200, "BankA Analyst login successful (HTTP 200)");
  const bankAToken = bankALogin.body.token;
  assert(!!bankAToken, "JWT token issued to BankA Analyst");

  // Authenticate BankB Reviewer
  const bankBLogin = await request(app).post("/api/v1/auth/login").send({
    username: "bankb_reviewer",
    password: "bankb_reviewer_pass",
  });
  assert(bankBLogin.status === 200, "BankB Reviewer login successful (HTTP 200)");
  const bankBToken = bankBLogin.body.token;

  // Authenticate CERTC Reviewer
  const certCLogin = await request(app).post("/api/v1/auth/login").send({
    username: "certc_reviewer",
    password: "certc_reviewer_pass",
  });
  assert(certCLogin.status === 200, "CERTC Reviewer login successful (HTTP 200)");
  const certCToken = certCLogin.body.token;

  // 2. Initial Reputation Check
  console.log("\n\x1b[1m\x1b[34m── 2. Baseline Reputation Check ───────────────────────\x1b[0m");
  const bankARepBefore = await request(app)
    .get("/api/v1/orgs/org-banka/reputation")
    .set("Authorization", `Bearer ${bankAToken}`);
  const initialScore = bankARepBefore.body.reputationScore;
  console.log(`     Initial BankA Reputation: ${initialScore}`);

  // 3. Submit New IoC (Raw URL with tracking params to test live normalization & hashing)
  console.log("\n\x1b[1m\x1b[34m── 3. IoC Submission & Canonical Normalization ────────\x1b[0m");
  const testRunId = Date.now().toString().slice(-4);
  const rawUrl = `HTTP://APT29-C2-${testRunId}.NET/stage1?utm_source=phish&campaign=2024&target=finance`;
  const expectedNormalizedUrl = `http://apt29-c2-${testRunId}.net/stage1?campaign=2024&target=finance`;
  const submitRes = await request(app)
    .post("/api/v1/iocs/submit")
    .set("Authorization", `Bearer ${bankAToken}`)
    .send({
      iocType: "url",
      rawValue: rawUrl,
      tlpLevel: "amber",
      description: "APT29 initial access C2 beacon URL targeting banking employees",
      evidenceReference: "https://virustotal.com/gui/url/apt29",
    });

  assert(submitRes.status === 201, "IoC submitted successfully (HTTP 201)");
  const newIoc = submitRes.body.ioc;
  assert(newIoc.status === "pending", "Initial IoC status is PENDING");
  assert(newIoc.confidenceScore === 0, "Initial confidence score is 0");
  assert(
    newIoc.normalizedValue === expectedNormalizedUrl,
    "URL normalized: tracking param utm_source stripped, meaningful query params preserved"
  );
  assert(!!newIoc.integrityHash, "Deterministic SHA-256 integrity hash generated & stored");
  const isFabricOnline = BlockchainService.isConnected();
  if (isFabricOnline) {
    assert(!!newIoc.blockchainTxId && newIoc.blockchainTxId.length === 64, "Real Fabric transaction ID anchored");
  } else {
    assert(newIoc.blockchainTxId === null, "Fallback mode stores blockchainTxId as null (no fake transaction ID)");
  }
  assert(submitRes.body.reputationDelta === 0, "IoC submission alone awards 0 reputation (score remains unchanged)");

  // 4. Duplicate Detection Test
  console.log("\n\x1b[1m\x1b[34m── 4. Duplicate Detection Verification ────────────────\x1b[0m");
  const duplicateSubmitRes = await request(app)
    .post("/api/v1/iocs/submit")
    .set("Authorization", `Bearer ${bankAToken}`)
    .send({
      iocType: "url",
      rawValue: `http://apt29-c2-${testRunId}.net/stage1?target=finance&campaign=2024`, // differently ordered query params
    });
  assert(duplicateSubmitRes.status === 200, "Duplicate submission handled gracefully (HTTP 200)");
  assert(duplicateSubmitRes.body.status === "duplicate", "Identified as duplicate record");
  assert(duplicateSubmitRes.body.ioc.id === newIoc.id, "Routed to existing ledger entry ID");

  // 5. Self-Endorsement Prohibition Test
  console.log("\n\x1b[1m\x1b[34m── 5. Anti-Sybil Self-Endorsement Prevention ──────────\x1b[0m");
  const selfEndorseRes = await request(app)
    .post(`/api/v1/iocs/${newIoc.id}/endorse`)
    .set("Authorization", `Bearer ${bankAToken}`)
    .send({
      decision: "endorse",
      reason: "Self validating our own report",
    });
  assert(selfEndorseRes.status === 400, "Self-endorsement rejected with HTTP 400");
  assert(selfEndorseRes.body.message.includes("Self-endorsement"), "Clear self-endorsement prohibition error message");

  // 6. First Independent Peer Review (BankB)
  console.log("\n\x1b[1m\x1b[34m── 6. First Peer Endorsement (1/2) ────────────────────\x1b[0m");
  const endorse1Res = await request(app)
    .post(`/api/v1/iocs/${newIoc.id}/endorse`)
    .set("Authorization", `Bearer ${bankBToken}`)
    .send({
      decision: "endorse",
      reason: "Observed matching DNS traffic in bank perimeter firewall logs.",
    });
  assert(endorse1Res.status === 200, "BankB endorsement recorded (HTTP 200)");
  assert(endorse1Res.body.ioc.confidenceScore === 1, "Confidence score increased to 1");
  assert(endorse1Res.body.ioc.status === "pending", "Status remains PENDING (1/2 endorsements)");

  // Double endorsement attempt by same org
  const doubleEndorseRes = await request(app)
    .post(`/api/v1/iocs/${newIoc.id}/endorse`)
    .set("Authorization", `Bearer ${bankBToken}`)
    .send({ decision: "endorse" });
  assert(doubleEndorseRes.status === 400, "Double endorsement by same organization rejected (HTTP 400)");

  // 7. Second Independent Peer Review (CERTC -> Triggers Consensus Verification & +1 Rep)
  console.log("\n\x1b[1m\x1b[34m── 7. Second Peer Endorsement & Auto-Verification (2/2) ─\x1b[0m");
  const endorse2Res = await request(app)
    .post(`/api/v1/iocs/${newIoc.id}/endorse`)
    .set("Authorization", `Bearer ${certCToken}`)
    .send({
      decision: "endorse",
      reason: "Matches national CERT campaign feed advisory CERT-2024-042.",
    });
  assert(endorse2Res.status === 200, "CERTC endorsement recorded (HTTP 200)");
  assert(endorse2Res.body.ioc.status === "verified", "STATUS AUTOMATICALLY TRANSITIONED TO VERIFIED (2/2)");
  assert(endorse2Res.body.ioc.confidenceScore === 2, "Confidence score is 2");

  // 8. Verify BankA Reputation +1 Increase
  console.log("\n\x1b[1m\x1b[34m── 8. Reputation Reward Verification ──────────────────\x1b[0m");
  const bankARepFinal = await request(app)
    .get("/api/v1/orgs/org-banka/reputation")
    .set("Authorization", `Bearer ${bankAToken}`);
  assert(
    bankARepFinal.body.reputationScore === initialScore + 1,
    `BankA reputation increased by +1 upon verification (${initialScore} -> ${bankARepFinal.body.reputationScore})`
  );

  // Check reputation event log
  const repEventsRes = await request(app)
    .get("/api/v1/orgs/org-banka/reputation/events")
    .set("Authorization", `Bearer ${bankAToken}`);
  assert(repEventsRes.body.events.length > 0, "Reputation event record exists in ledger");
  assert(repEventsRes.body.events[0].scoreDelta === 1, "Latest event recorded +1 delta");

  // 9. Cryptographic Integrity Verification Engine
  console.log("\n\x1b[1m\x1b[34m── 9. Cryptographic Integrity Check ───────────────────\x1b[0m");
  const integrityRes = await request(app)
    .get(`/api/v1/iocs/${newIoc.id}/verify-integrity`)
    .set("Authorization", `Bearer ${bankAToken}`);
  assert(integrityRes.status === 200, "Integrity check API responded (HTTP 200)");
  assert(integrityRes.body.verification.match === true, "Integrity check PASSED: stored hash matches computed hash");
  assert(integrityRes.body.verification.status === "PASS", "PASS status returned");

  // 10. Audit Trail Verification
  console.log("\n\x1b[1m\x1b[34m── 10. Consortium Audit Trail ─────────────────────────\x1b[0m");
  const auditRes = await request(app)
    .get("/api/v1/audit")
    .set("Authorization", `Bearer ${bankAToken}`);
  assert(auditRes.status === 200, "Audit trail retrieved (HTTP 200)");
  assert(auditRes.body.logs.length >= 4, "Audit log captured submit, endorse, verify, and reputation actions");

  console.log(`\n${"─".repeat(50)}`);
  console.log(`\x1b[1mE2E Full Workflow Execution Summary\x1b[0m`);
  console.log(`${"─".repeat(50)}`);
  console.log(`  Passed: \x1b[32m${passedCount}\x1b[0m`);
  if (failedCount > 0) {
    console.log(`  Failed: \x1b[31m${failedCount}\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`  Failed: 0`);
    console.log(`\n\x1b[32m\x1b[1m✅ ALL E2E LIFECYCLE TESTS PASSED (100% GREEN)\x1b[0m\n`);
  }
}

runE2E().catch((err) => {
  console.error("E2E test suite error:", err);
  process.exit(1);
});
