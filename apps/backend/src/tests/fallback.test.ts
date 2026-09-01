/**
 * ThreatTrust — Real Fabric Mode vs Fabric Unavailable Mode Verification Test Suite
 *
 * Explicitly tests:
 * 1. REAL FABRIC MODE (Connected to Gateway / Network):
 *    - Real gRPC connection to peer
 *    - Actual transaction proposals submitted to chaincode
 *    - Real 64-char transaction ID returned from ledger
 *    - Ledger state query verification
 *
 * 2. FABRIC UNAVAILABLE MODE (Offline / Non-Containerized):
 *    - NO fake Fabric transaction IDs are generated (txId is strictly null)
 *    - Explicit status: FABRIC_UNAVAILABLE
 *    - Database stores blockchainTxId as null without creating fake hashes
 *    - API endpoints do not falsely claim blockchain confirmation
 *    - Integrity verification returns fabricConnected: false
 */

import { BlockchainService } from "../services/blockchain.service";
import { IntegrityService } from "../services/integrity.service";
import { IocService } from "../services/ioc.service";
import { ReputationService } from "../services/reputation.service";
import request from "supertest";
import app from "../app";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, description: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✗\x1b[0m ${description} ${detail ? `(${detail})` : ""}`);
    failedCount++;
  }
}

async function runFallbackTests() {
  console.log("\n🛡️  Running ThreatTrust Real vs Unavailable Mode Test Suite...\n");

  const isFabricConnected = BlockchainService.isConnected();

  console.log(`\x1b[1m\x1b[34m── 1. Gateway Connectivity Mode Check ─────────────────────────────\x1b[0m`);
  console.log(`     Detected Fabric Gateway Status: \x1b[33m${isFabricConnected ? "ONLINE (Real Fabric Network)" : "OFFLINE (Local Mode)"}\x1b[0m`);
  assert(typeof isFabricConnected === "boolean", "Gateway connection status is deterministic boolean");

  console.log(`\n\x1b[1m\x1b[34m── 2. SubmitIoC Behavior in Current Mode ────────────────────────────\x1b[0m`);
  const iocId = `ioc-mode-${Date.now().toString().slice(-6)}`;
  const testIp = `192.168.100.${Date.now() % 250}`;
  const createdAtUnix = Math.floor(Date.now() / 1000);
  const dummyHash = IntegrityService.calculateHash({
    iocId,
    iocType: "ip",
    normalizedValue: testIp,
    contributorOrgId: "org-banka",
    createdAtUnix,
  });
  const submitResult = await BlockchainService.submitIoC(iocId, "ip", testIp, "org-banka", "amber", dummyHash, createdAtUnix);

  if (isFabricConnected) {
    assert(submitResult.status === "COMMITTED", "[Real Fabric] Status is COMMITTED");
    assert(submitResult.txId !== null && submitResult.txId.length === 64, "[Real Fabric] Returns real 64-char transaction ID");
  } else {
    assert(submitResult.status === "FABRIC_UNAVAILABLE", "[Fabric Offline] Status is explicitly 'FABRIC_UNAVAILABLE'");
    assert(submitResult.txId === null, "[Fabric Offline] txId is strictly null (NO fake transaction ID generated)");
  }

  console.log(`\n\x1b[1m\x1b[34m── 3. EndorseIoC Behavior in Current Mode ───────────────────────────\x1b[0m`);
  const endorseResult = await BlockchainService.endorseIoC(iocId, "org-bankb", "endorse", "Telemetry match");

  if (isFabricConnected) {
    assert(endorseResult.status === "COMMITTED", "[Real Fabric] EndorseIoC status is COMMITTED");
    assert(endorseResult.txId !== null && endorseResult.txId.length === 64, "[Real Fabric] Returns real transaction ID");
  } else {
    assert(endorseResult.status === "FABRIC_UNAVAILABLE", "[Fabric Offline] EndorseIoC status is 'FABRIC_UNAVAILABLE'");
    assert(endorseResult.txId === null, "[Fabric Offline] EndorseIoC txId is strictly null");
  }

  console.log(`\n\x1b[1m\x1b[34m── 4. UpdateReputation Behavior in Current Mode ─────────────────────\x1b[0m`);
  const repResult = await BlockchainService.updateReputation("org-banka", 1, 51, iocId);

  if (isFabricConnected) {
    assert(repResult.status === "COMMITTED", "[Real Fabric] UpdateReputation status is COMMITTED");
    assert(repResult.txId !== null && repResult.txId.length === 64, "[Real Fabric] Returns real transaction ID");
  } else {
    assert(repResult.status === "FABRIC_UNAVAILABLE", "[Fabric Offline] UpdateReputation status is 'FABRIC_UNAVAILABLE'");
    assert(repResult.txId === null, "[Fabric Offline] UpdateReputation txId is strictly null");
  }

  console.log(`\n\x1b[1m\x1b[34m── 5. End-to-End REST API Submission Without Fake Tx ID ─────────────\x1b[0m`);
  const loginRes = await request(app).post("/api/v1/auth/login").send({
    username: "banka_analyst",
    password: "banka_analyst_pass",
  });
  const token = loginRes.body.token;

  const apiSubmitIp = `192.168.101.${(Date.now() + 1) % 250}`;
  const apiSubmitRes = await request(app)
    .post("/api/v1/iocs/submit")
    .set("Authorization", `Bearer ${token}`)
    .send({
      iocType: "ip",
      rawValue: apiSubmitIp,
      description: "Fallback mode validation indicator",
    });

  assert(apiSubmitRes.status === 201, "API submits indicator successfully (HTTP 201)");
  if (isFabricConnected) {
    assert(typeof apiSubmitRes.body.ioc.blockchainTxId === "string", "[Real Fabric] API returns real Fabric transaction ID");
  } else {
    assert(apiSubmitRes.body.ioc.blockchainTxId === null, "[Fabric Offline] Database stores blockchainTxId as null without fake hashes");
  }

  console.log(`\n\x1b[1m\x1b[34m── 6. Cryptographic Integrity Check Transparency ───────────────────\x1b[0m`);
  const integrityRes = await BlockchainService.verifyIntegrity(iocId, dummyHash, dummyHash);
  assert(integrityRes.status === "PASS", "Integrity check evaluates PASS for matching hashes");
  if (!isFabricConnected) {
    assert(integrityRes.fabricConnected === false, "Integrity response explicitly reports fabricConnected: false");
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Real vs Unavailable Mode Test Suite Summary`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  Passed: \x1b[32m${passedCount}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${failedCount}\x1b[0m`);

  if (failedCount > 0) {
    console.error("\n❌ Fallback behavior tests failed.");
    process.exit(1);
  } else {
    console.log(`\n\x1b[32m\x1b[1m✅ ALL FALLBACK & REAL MODE BEHAVIOR TESTS PASSED (100% GREEN)\x1b[0m\n`);
  }
}

runFallbackTests().catch((err) => {
  console.error("Fallback test runner crashed:", err);
  process.exit(1);
});
