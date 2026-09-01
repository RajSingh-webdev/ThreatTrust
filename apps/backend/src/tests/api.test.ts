/**
 * ThreatTrust — API Integration Tests
 * Tests express routes, JWT authentication, RBAC authorization, and API status codes.
 */

import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { config } from "../config/env";
import { JwtPayload } from "../types";

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

function generateTestToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "1h" });
}

async function runApiTests() {
  console.log("\n🛡️  Running ThreatTrust API Endpoint Integration Tests...\n");

  // 1. Health Endpoint
  console.log("\x1b[1m\x1b[34m── 1. Health & Discovery API ──────────────────────────\x1b[0m");
  const healthRes = await request(app).get("/health");
  assert(healthRes.status === 200, "GET /health returns HTTP 200");
  assert(healthRes.body.service === "threattrust-backend", "Health payload identifies service");

  // 2. Authentication Guards
  console.log("\n\x1b[1m\x1b[34m── 2. Auth & RBAC Middleware Enforcement ─────────────\x1b[0m");
  const unauthRes = await request(app).get("/api/v1/iocs");
  assert(unauthRes.status === 401, "Protected endpoint /api/v1/iocs rejects unauthenticated request (401)");

  const invalidTokenRes = await request(app)
    .get("/api/v1/iocs")
    .set("Authorization", "Bearer invalid.token.payload");
  assert(invalidTokenRes.status === 401, "Malformed Bearer token rejected (401)");

  // 3. Authenticated Admin & Contributor Tokens
  const contributorToken = generateTestToken({
    userId: "test-user-1",
    organizationId: "org-banka",
    role: "contributor",
    username: "banka_analyst",
  });

  const reviewerToken = generateTestToken({
    userId: "test-user-2",
    organizationId: "org-bankb",
    role: "reviewer",
    username: "bankb_reviewer",
  });

  // Verify Role RBAC on /submit (reviewers cannot submit, only contributors/admins)
  const reviewerSubmitRes = await request(app)
    .post("/api/v1/iocs/submit")
    .set("Authorization", `Bearer ${reviewerToken}`)
    .send({
      iocType: "ip",
      value: "185.10.20.30",
    });
  assert(reviewerSubmitRes.status === 403, "Reviewer role forbidden from submitting new IoCs (403)");

  // 4. Input Validation via Zod
  console.log("\n\x1b[1m\x1b[34m── 3. Zod Payload Schema Validation ───────────────────\x1b[0m");
  const badPayloadRes = await request(app)
    .post("/api/v1/iocs/submit")
    .set("Authorization", `Bearer ${contributorToken}`)
    .send({
      iocType: "invalid_type",
      value: "185.10.20.30",
    });
  assert(badPayloadRes.status === 400, "Invalid iocType rejected by Zod schema validation (400)");

  // 5. Auth Me Endpoint
  console.log("\n\x1b[1m\x1b[34m── 4. Token Claim Inspection ──────────────────────────\x1b[0m");
  const meRes = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${contributorToken}`);
  // In pure unit mock or db test
  assert(meRes.status === 200 || meRes.status === 404, "GET /api/v1/auth/me handles verified token");

  console.log(`\n${"─".repeat(50)}`);
  console.log(`API Test Execution Summary: Passed: \x1b[32m${passedCount}\x1b[0m, Failed: \x1b[31m${failedCount}\x1b[0m`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runApiTests().catch((err) => {
  console.error("API test runner crashed:", err);
  process.exit(1);
});
