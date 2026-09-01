-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('bank', 'cert', 'enterprise_soc');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('pending', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'contributor', 'reviewer');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "IocType" AS ENUM ('ip', 'url', 'domain', 'file_hash');

-- CreateEnum
CREATE TYPE "IocStatus" AS ENUM ('pending', 'verified', 'rejected', 'flagged');

-- CreateEnum
CREATE TYPE "TlpLevel" AS ENUM ('white', 'green', 'amber', 'red');

-- CreateEnum
CREATE TYPE "EndorsementDecision" AS ENUM ('endorse', 'reject', 'flag');

-- CreateEnum
CREATE TYPE "ReputationEventType" AS ENUM ('valid_submission', 'false_submission', 'endorsement_given', 'penalty');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('submit_ioc', 'endorse_ioc', 'reject_ioc', 'verify_ioc', 'flag_ioc', 'register_org', 'integrity_check', 'update_reputation');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "org_type" "OrgType" NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'active',
    "fabric_msp_id" VARCHAR(100),
    "reputation_score" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iocs" (
    "id" TEXT NOT NULL,
    "ioc_type" "IocType" NOT NULL,
    "raw_value" TEXT NOT NULL,
    "normalized_value" TEXT NOT NULL,
    "contributor_org_id" TEXT NOT NULL,
    "status" "IocStatus" NOT NULL DEFAULT 'pending',
    "confidence_score" INTEGER NOT NULL DEFAULT 0,
    "reputation_at_submit" INTEGER NOT NULL,
    "integrity_hash" VARCHAR(64),
    "blockchain_tx_id" VARCHAR(255),
    "tlp_level" "TlpLevel" NOT NULL DEFAULT 'amber',
    "description" TEXT,
    "evidence_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iocs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endorsements" (
    "id" TEXT NOT NULL,
    "ioc_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "decision" "EndorsementDecision" NOT NULL,
    "reason" TEXT,
    "blockchain_tx_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_type" "ReputationEventType" NOT NULL,
    "score_delta" INTEGER NOT NULL,
    "related_ioc_id" TEXT,
    "previous_score" INTEGER NOT NULL,
    "new_score" INTEGER NOT NULL,
    "blockchain_tx_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_org_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "object_id" TEXT,
    "blockchain_tx_id" VARCHAR(255),
    "result" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "iocs_ioc_type_normalized_value_key" ON "iocs"("ioc_type", "normalized_value");

-- CreateIndex
CREATE UNIQUE INDEX "endorsements_ioc_id_organization_id_key" ON "endorsements"("ioc_id", "organization_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iocs" ADD CONSTRAINT "iocs_contributor_org_id_fkey" FOREIGN KEY ("contributor_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_ioc_id_fkey" FOREIGN KEY ("ioc_id") REFERENCES "iocs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_related_ioc_id_fkey" FOREIGN KEY ("related_ioc_id") REFERENCES "iocs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_org_id_fkey" FOREIGN KEY ("actor_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "iocs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

