import { IocService } from "../services/ioc.service";
import { BlockchainService } from "../services/blockchain.service";
import { IntegrityService } from "../services/integrity.service";
import prisma from "../db";

async function runRealFabricWorkflow() {
  console.log("\n=======================================================");
  console.log("🛡️ THREATTRUST — REAL HYPERLEDGER FABRIC E2E WORKFLOW");
  console.log("=======================================================\n");

  // Step 0: Ensure actors exist
  const bankAUser = await prisma.user.findFirst({
    where: { organization: { name: "BankA" } },
    include: { organization: true },
  });
  const bankBUser = await prisma.user.findFirst({
    where: { organization: { name: "BankB" } },
    include: { organization: true },
  });
  const certCUser = await prisma.user.findFirst({
    where: { organization: { name: "CERTC" } },
    include: { organization: true },
  });

  if (!bankAUser || !bankBUser || !certCUser) {
    throw new Error("Required seed organizations (BankA, BankB, CERTC) not found in PostgreSQL database.");
  }

  console.log(`👤 Actor 1 (BankA): ${bankAUser.username} (Org ID: ${bankAUser.organizationId}, MSP: ${bankAUser.organization.fabricMspId})`);
  console.log(`👤 Actor 2 (BankB): ${bankBUser.username} (Org ID: ${bankBUser.organizationId}, MSP: ${bankBUser.organization.fabricMspId})`);
  console.log(`👤 Actor 3 (CERTC): ${certCUser.username} (Org ID: ${certCUser.organizationId}, MSP: ${certCUser.organization.fabricMspId})\n`);

  const initialRepBankA = bankAUser.organization.reputationScore;
  console.log(`📊 Initial BankA Reputation: ${initialRepBankA} (Target starting baseline: 50)\n`);

  // Target test IoC (Fresh unique test indicator)
  const testIocRaw = "185.010.020.105"; // with leading zeros to prove normalization
  const expectedNormalized = "185.10.20.105";
  const iocType = "ip";

  // Clean any previous test run artifact for this specific IP if exists in DB
  const preExisting = await prisma.ioc.findUnique({
    where: { unique_ioc_type_value: { iocType, normalizedValue: expectedNormalized } },
  });
  if (preExisting) {
    await prisma.endorsement.deleteMany({ where: { iocId: preExisting.id } });
    await prisma.auditLog.deleteMany({ where: { objectId: preExisting.id } });
    await prisma.reputationHistory.deleteMany({ where: { relatedIocId: preExisting.id } });
    await prisma.ioc.delete({ where: { id: preExisting.id } });
  }

  // =========================================================================
  // STEP 1: BankA Submission
  // =========================================================================
  console.log("-------------------------------------------------------");
  console.log("STEP 1: BankA IoC Submission via Real Fabric");
  console.log("-------------------------------------------------------");

  const submissionResult = await IocService.submitIoc(
    {
      iocType: "ip",
      rawValue: testIocRaw,
      tlpLevel: "amber",
      description: "C2 infrastructure identified in malicious spearphishing campaign targeting financial endpoints",
      evidenceReference: "https://threat-intel.banka.internal/report/2026-08-99",
    },
    {
      userId: bankAUser.id,
      organizationId: bankAUser.organizationId,
      role: bankAUser.role,
      username: bankAUser.username,
    }
  );

  const createdIoc = submissionResult.ioc;
  console.log(`✅ IoC Created in PostgreSQL: ${createdIoc.id}`);
  console.log(`   Normalized Value: ${createdIoc.normalizedValue}`);
  console.log(`   Integrity Hash: ${createdIoc.integrityHash}`);
  console.log(`   Real Fabric TxID: ${createdIoc.blockchainTxId}`);
  console.log(`   Status: ${createdIoc.status.toUpperCase()}`);
  console.log(`   Confidence: ${createdIoc.confidenceScore}/2`);

  if (!createdIoc.blockchainTxId) {
    throw new Error("FAIL: Submission did not return a real Fabric blockchainTxId!");
  }

  // =========================================================================
  // STEP 2: Verify BankA Ledger State directly on Fabric
  // =========================================================================
  console.log("\n-------------------------------------------------------");
  console.log("STEP 2: Query IoC directly from Hyperledger Fabric Ledger");
  console.log("-------------------------------------------------------");

  const fabricRecord = await BlockchainService.getThreat(createdIoc.id, "org-banka");
  console.log("📖 On-Chain Threat Record retrieved via GetThreat:");
  console.log(JSON.stringify(fabricRecord, null, 2));

  if (!fabricRecord || fabricRecord.id !== createdIoc.id) {
    throw new Error("FAIL: Fabric ledger does not contain the committed IoC record!");
  }
  if (fabricRecord.status !== "pending") {
    throw new Error(`FAIL: Expected initial status 'pending', got '${fabricRecord.status}'`);
  }
  if (fabricRecord.integrity_hash !== createdIoc.integrityHash) {
    throw new Error("FAIL: On-chain integrity hash does not match PostgreSQL hash!");
  }
  console.log("✅ Fabric on-chain state perfectly matches PostgreSQL database record.");

  // =========================================================================
  // STEP 3: BankB Endorsement
  // =========================================================================
  console.log("\n-------------------------------------------------------");
  console.log("STEP 3: BankB Endorsement Submission");
  console.log("-------------------------------------------------------");

  const bankBEndorsementResult = await IocService.endorseIoc(
    createdIoc.id,
    {
      decision: "endorse",
      reason: "Observed identical outbound beaconing telemetry on perimeter firewalls.",
    },
    {
      userId: bankBUser.id,
      organizationId: bankBUser.organizationId,
      role: bankBUser.role,
    }
  );

  const bankBEndorsements = await prisma.endorsement.findMany({ where: { iocId: createdIoc.id } });
  console.log(`✅ BankB Endorsement Committed: Decision = ${bankBEndorsements[0]?.decision}`);
  console.log(`   Endorsement TxID: ${bankBEndorsements[0]?.blockchainTxId}`);
  console.log(`   IoC Status: ${bankBEndorsementResult.ioc.status.toUpperCase()} (Confidence: ${bankBEndorsementResult.ioc.confidenceScore}/2)`);

  const repAfterBankB = await prisma.organization.findUnique({ where: { id: bankAUser.organizationId } });
  console.log(`   BankA Reputation: ${repAfterBankB?.reputationScore} (No +1 yet, threshold 2/2 not met)`);

  if (bankBEndorsementResult.ioc.status !== "pending") {
    throw new Error(`FAIL: Status should remain 'pending' at 1/2 endorsements, got '${bankBEndorsementResult.ioc.status}'`);
  }

  // =========================================================================
  // STEP 4: CERTC Endorsement & Threshold Auto-Verification
  // =========================================================================
  console.log("\n-------------------------------------------------------");
  console.log("STEP 4: CERTC Endorsement & Consensus Verification (2/2)");
  console.log("-------------------------------------------------------");

  const certCEndorsementResult = await IocService.endorseIoc(
    createdIoc.id,
    {
      decision: "endorse",
      reason: "National CERT telemetry independently corroborated active malicious C2 infrastructure.",
    },
    {
      userId: certCUser.id,
      organizationId: certCUser.organizationId,
      role: certCUser.role,
    }
  );

  const allEndorsements = await prisma.endorsement.findMany({ where: { iocId: createdIoc.id } });
  console.log(`✅ CERTC Endorsement Committed: Total Endorsements = ${allEndorsements.length}/2`);
  console.log(`   Final IoC Status: ${certCEndorsementResult.ioc.status.toUpperCase()}`);
  console.log(`   Verification Blockchain TxID: ${certCEndorsementResult.ioc.blockchainTxId}`);

  const repAfterCertC = await prisma.organization.findUnique({ where: { id: bankAUser.organizationId } });
  console.log(`   BankA Reputation After Verification: ${repAfterCertC?.reputationScore} (Target: ${initialRepBankA + 1})`);

  if (certCEndorsementResult.ioc.status !== "verified") {
    throw new Error(`FAIL: Expected status 'verified' at 2/2 threshold, got '${certCEndorsementResult.ioc.status}'`);
  }
  if (repAfterCertC?.reputationScore !== initialRepBankA + 1) {
    throw new Error(`FAIL: Expected BankA reputation score to increase to ${initialRepBankA + 1}, got ${repAfterCertC?.reputationScore}`);
  }

  // Verify on Fabric Ledger
  const fabricFinalRecord = await BlockchainService.getThreat(createdIoc.id, "org-certc");
  console.log("📖 On-Chain Verified Threat Record retrieved directly from Fabric:");
  console.log(JSON.stringify(fabricFinalRecord, null, 2));

  // =========================================================================
  // STEP 5: Database Consistency Check
  // =========================================================================
  console.log("\n-------------------------------------------------------");
  console.log("STEP 5: Database Consistency & Cross-Validation");
  console.log("-------------------------------------------------------");

  const dbFinalIoc = await prisma.ioc.findUnique({
    where: { id: createdIoc.id },
    include: { endorsements: true, contributorOrg: true },
  });

  console.log("PostgreSQL vs Hyperledger Fabric State:");
  console.log(`- ID: DB=${dbFinalIoc?.id} | Fabric=${fabricFinalRecord.id} -> MATCH: ${dbFinalIoc?.id === fabricFinalRecord.id}`);
  console.log(`- Status: DB=${dbFinalIoc?.status} | Fabric=${fabricFinalRecord.status} -> MATCH: ${dbFinalIoc?.status === fabricFinalRecord.status}`);
  console.log(`- Contributor: DB=${dbFinalIoc?.contributorOrgId} | Fabric=${fabricFinalRecord.contributor_org_id} -> MATCH: ${dbFinalIoc?.contributorOrgId === fabricFinalRecord.contributor_org_id}`);
  console.log(`- Integrity Hash: DB=${dbFinalIoc?.integrityHash} | Fabric=${fabricFinalRecord.integrity_hash} -> MATCH: ${dbFinalIoc?.integrityHash === fabricFinalRecord.integrity_hash}`);
  console.log(`- Endorsements Count: DB=${dbFinalIoc?.endorsements.length} | Fabric=${fabricFinalRecord.endorsements?.length} -> MATCH: ${dbFinalIoc?.endorsements.length === fabricFinalRecord.endorsements?.length}`);

  // =========================================================================
  // STEP 6: Cryptographic Integrity Verification (PASS -> FAIL -> PASS)
  // =========================================================================
  console.log("\n-------------------------------------------------------");
  console.log("STEP 6: Cryptographic Integrity Verification");
  console.log("-------------------------------------------------------");

  // 1. Normal state -> PASS
  const check1 = await IocService.verifyIocIntegrity(createdIoc.id);
  console.log(`1. Untampered Integrity Verification: ${check1.status} (Match: ${check1.match}, Fabric Connected: ${check1.fabricConnected})`);
  if (check1.status !== "PASS") throw new Error("FAIL: Untampered record failed integrity check!");

  // 2. Tamper DB -> FAIL
  console.log("   Simulating unauthorized off-chain database modification...");
  await prisma.ioc.update({
    where: { id: createdIoc.id },
    data: { normalizedValue: "185.10.20.200" }, // Tampered value
  });

  const check2 = await IocService.verifyIocIntegrity(createdIoc.id);
  console.log(`2. Tampered Integrity Verification: ${check2.status} (Match: ${check2.match}, Tamper Detected: ${check2.tamperDetected})`);
  if (check2.status !== "FAIL") throw new Error("FAIL: Tampered record was not detected by integrity check!");

  // 3. Restore -> PASS
  console.log("   Restoring authentic database record...");
  await prisma.ioc.update({
    where: { id: createdIoc.id },
    data: { normalizedValue: expectedNormalized },
  });

  const check3 = await IocService.verifyIocIntegrity(createdIoc.id);
  console.log(`3. Restored Integrity Verification: ${check3.status} (Match: ${check3.match})`);
  if (check3.status !== "PASS") throw new Error("FAIL: Restored record failed integrity check!");

  // =========================================================================
  // STEP 7: Negative Test Scenarios
  // =========================================================================
  console.log("\n-------------------------------------------------------");
  console.log("STEP 7: Negative Tests");
  console.log("-------------------------------------------------------");

  // A. BankA attempts self-endorsement
  let selfEndorseCaught = false;
  try {
    await IocService.endorseIoc(
      createdIoc.id,
      { decision: "endorse", reason: "Trying to endorse own IoC" },
      { userId: bankAUser.id, organizationId: bankAUser.organizationId, role: bankAUser.role }
    );
  } catch (err: any) {
    selfEndorseCaught = true;
    console.log(`A. Self-Endorsement Attempt: REJECTED (${err.message})`);
  }
  if (!selfEndorseCaught) throw new Error("FAIL: Self-endorsement was not blocked!");

  // B. BankB attempts duplicate endorsement
  let doubleEndorseCaught = false;
  try {
    await IocService.endorseIoc(
      createdIoc.id,
      { decision: "endorse", reason: "Trying to endorse second time" },
      { userId: bankBUser.id, organizationId: bankBUser.organizationId, role: bankBUser.role }
    );
  } catch (err: any) {
    doubleEndorseCaught = true;
    console.log(`B. Duplicate Endorsement Attempt: REJECTED (${err.message})`);
  }
  if (!doubleEndorseCaught) throw new Error("FAIL: Double endorsement was not blocked!");

  // C. Duplicate Submission
  const dupSubmit = await IocService.submitIoc(
    {
      iocType: "ip",
      rawValue: expectedNormalized,
      description: "Duplicate attempt",
    },
    { userId: bankBUser.id, organizationId: bankBUser.organizationId, role: bankBUser.role, username: bankBUser.username }
  );
  console.log(`C. Duplicate Submission: Routed to existing record ${dupSubmit.ioc.id} (isDuplicate = ${dupSubmit.isDuplicate})`);
  if (!dupSubmit.isDuplicate || dupSubmit.ioc.id !== createdIoc.id) {
    throw new Error("FAIL: Duplicate submission was not correctly routed!");
  }

  // D. IP vs Domain Differentiation
  const domainSubmit = await IocService.submitIoc(
    {
      iocType: "domain",
      rawValue: expectedNormalized, // domain with same string
      description: "Domain format test",
    },
    { userId: bankBUser.id, organizationId: bankBUser.organizationId, role: bankBUser.role, username: bankBUser.username }
  );
  console.log(`D. Domain vs IP Distinction: Domain IoC ID ${domainSubmit.ioc.id} != IP IoC ID ${createdIoc.id} (isDuplicate = ${domainSubmit.isDuplicate})`);
  if (domainSubmit.ioc.id === createdIoc.id) {
    throw new Error("FAIL: IP and Domain with same string were incorrectly treated as duplicates!");
  }

  // E. Verify Reputation is not double-awarded
  const repFinal = await prisma.organization.findUnique({ where: { id: bankAUser.organizationId } });
  console.log(`E. Reputation Invariance Check: Final BankA score = ${repFinal?.reputationScore} (Exactly +1 total awarded)`);
  if (repFinal?.reputationScore !== initialRepBankA + 1) {
    throw new Error("FAIL: Duplicate reputation award detected!");
  }

  console.log("\n=======================================================");
  console.log("🎉 ALL REAL FABRIC WORKFLOW STEPS & NEGATIVE TESTS PASSED!");
  console.log("=======================================================\n");

  return {
    testIocId: createdIoc.id,
    testIocValue: expectedNormalized,
    submitTxId: createdIoc.blockchainTxId,
    bankBEndorseTxId: allEndorsements.find((e: any) => e.organizationId === bankBUser.organizationId)?.blockchainTxId,
    certCEndorseTxId: allEndorsements.find((e: any) => e.organizationId === certCUser.organizationId)?.blockchainTxId,
    verifyTxId: certCEndorsementResult.ioc.blockchainTxId,
    initialRep: initialRepBankA,
    finalRep: repFinal?.reputationScore,
  };
}

runRealFabricWorkflow()
  .then((res) => {
    console.log("EXECUTION SUMMARY RESULT:", JSON.stringify(res, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("EXECUTION FAILED:", err);
    process.exit(1);
  });
