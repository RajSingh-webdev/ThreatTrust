/**
 * ThreatTrust — Database Seed Script
 *
 * Seeds 3 simulated organizations (BankA, BankB, CERTC) with:
 * - initial reputation score: 50
 * - prototype users with appropriate roles
 *
 * Passwords are hashed with bcrypt (rounds=10).
 *
 * Run with: npm run db:seed
 */

import { PrismaClient, OrgType, OrgStatus, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;
const INITIAL_REPUTATION = 50;

interface OrgSeed {
  name: string;
  orgType: OrgType;
  fabricMspId: string;
  users: {
    username: string;
    password: string;
    role: UserRole;
  }[];
}

const ORGANIZATIONS: OrgSeed[] = [
  {
    name: "BankA",
    orgType: OrgType.bank,
    fabricMspId: "BankAMSP",
    users: [
      {
        username: "banka_admin",
        password: "banka_admin_pass",
        role: UserRole.admin,
      },
      {
        username: "banka_analyst",
        password: "banka_analyst_pass",
        role: UserRole.contributor,
      },
    ],
  },
  {
    name: "BankB",
    orgType: OrgType.bank,
    fabricMspId: "BankBMSP",
    users: [
      {
        username: "bankb_analyst",
        password: "bankb_analyst_pass",
        role: UserRole.contributor,
      },
      {
        username: "bankb_reviewer",
        password: "bankb_reviewer_pass",
        role: UserRole.reviewer,
      },
    ],
  },
  {
    name: "CERTC",
    orgType: OrgType.cert,
    fabricMspId: "CERTCMSP",
    users: [
      {
        username: "certc_analyst",
        password: "certc_analyst_pass",
        role: UserRole.contributor,
      },
      {
        username: "certc_reviewer",
        password: "certc_reviewer_pass",
        role: UserRole.reviewer,
      },
    ],
  },
];

async function main() {
  console.log("🌱 Starting ThreatTrust database seed...\n");

  for (const orgData of ORGANIZATIONS) {
    console.log(`📦 Seeding organization: ${orgData.name}`);

    // Upsert organization (idempotent re-runs)
    const org = await prisma.organization.upsert({
      where: { name: orgData.name },
      update: {},
      create: {
        name: orgData.name,
        orgType: orgData.orgType,
        status: OrgStatus.active,
        fabricMspId: orgData.fabricMspId,
        reputationScore: INITIAL_REPUTATION,
      },
    });

    console.log(
      `   ✅ Org: ${org.name} | type=${org.orgType} | reputation=${org.reputationScore} | id=${org.id}`
    );

    // Seed users for this org
    for (const userData of orgData.users) {
      const passwordHash = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);

      const user = await prisma.user.upsert({
        where: { username: userData.username },
        update: {},
        create: {
          organizationId: org.id,
          username: userData.username,
          passwordHash,
          role: userData.role,
          status: UserStatus.active,
        },
      });

      console.log(
        `   👤 User: ${user.username} | role=${user.role} | orgId=${user.organizationId}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // Verification summary
  // -------------------------------------------------------------------------
  console.log("\n📊 Seed verification:\n");

  const orgs = await prisma.organization.findMany({
    include: { users: true },
    orderBy: { name: "asc" },
  });

  for (const org of orgs) {
    console.log(`  Org: ${org.name}`);
    console.log(`    - Type:       ${org.orgType}`);
    console.log(`    - Status:     ${org.status}`);
    console.log(`    - Reputation: ${org.reputationScore}`);
    console.log(`    - MSP:        ${org.fabricMspId}`);
    console.log(`    - Users:`);
    for (const u of org.users) {
      console.log(`        • ${u.username} (${u.role})`);
    }
  }

  const totalOrgs = await prisma.organization.count();
  const totalUsers = await prisma.user.count();

  console.log(`\n✅ Seed complete.`);
  console.log(`   Total organizations: ${totalOrgs}`);
  console.log(`   Total users:         ${totalUsers}`);

  if (totalOrgs !== 3) {
    throw new Error(`Expected 3 organizations, found ${totalOrgs}`);
  }
  if (totalUsers !== 6) {
    throw new Error(`Expected 6 users, found ${totalUsers}`);
  }

  // Verify all orgs start at reputation 50
  const mismatched = orgs.filter((o) => o.reputationScore !== INITIAL_REPUTATION);
  if (mismatched.length > 0) {
    throw new Error(
      `Orgs with wrong initial reputation: ${mismatched.map((o) => o.name).join(", ")}`
    );
  }
  console.log(`   All organizations have initial reputation = ${INITIAL_REPUTATION} ✅`);
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
