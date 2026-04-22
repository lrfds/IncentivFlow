-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CONSULTOR', 'CLIENTE', 'AUDITOR');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('EM_ANDAMENTO', 'APROVADO', 'CONCLUIDO', 'ARQUIVADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('ELABORACAO', 'APROVACAO_CLIENTE', 'SUBMISSAO', 'ACOMPANHAMENTO', 'POS_APROVACAO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" VARCHAR(18) NOT NULL,
    "plan" VARCHAR(20) NOT NULL DEFAULT 'PRO',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CONSULTOR',
    "avatarUrl" TEXT,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "cnpj" VARCHAR(18) NOT NULL,
    "sector" VARCHAR(100) NOT NULL,
    "contactName" VARCHAR(120) NOT NULL DEFAULT '',
    "contactEmail" VARCHAR(255) NOT NULL,
    "contactPhone" VARCHAR(20),
    "razaoSocial" VARCHAR(200),
    "nomeFantasia" VARCHAR(200),
    "source" VARCHAR(30),
    "verifiedAt" TIMESTAMPTZ(3),
    "dataAbertura" DATE,
    "situacaoCadastralCodigo" VARCHAR(10),
    "situacaoCadastralDescricao" VARCHAR(120),
    "situacaoCadastralData" DATE,
    "situacaoCadastralMotivo" VARCHAR(200),
    "naturezaJuridicaCodigo" VARCHAR(10),
    "naturezaJuridicaDescricao" VARCHAR(200),
    "capitalSocial" DECIMAL(15,2),
    "porte" VARCHAR(80),
    "enteFederativoResponsavel" VARCHAR(150),
    "situacaoEspecial" VARCHAR(150),
    "readinessScore" INTEGER,
    "readinessLabel" VARCHAR(100),
    "incentiveBadges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "address" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "aggregateId" UUID NOT NULL,
    "aggregateType" VARCHAR(50) NOT NULL DEFAULT 'Project',
    "type" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "prevHash" CHAR(64),
    "hash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID,
    "code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "currentPhase" "PhaseType" NOT NULL DEFAULT 'ELABORACAO',
    "valueRequested" DECIMAL(15,2),
    "valueApproved" DECIMAL(15,2),
    "valueCaptured" DECIMAL(15,2),
    "submissionDeadline" TIMESTAMPTZ(3),
    "submittedAt" TIMESTAMPTZ(3),
    "approvedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "protocolNumber" VARCHAR(100),
    "governmentBody" VARCHAR(200),
    "tags" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 0,
    "lastEventAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_read_models" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID,
    "clientName" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "approvedValue" DECIMAL(15,2),
    "capturedValue" DECIMAL(15,2),
    "capturePercent" DOUBLE PRECISION,
    "documentsCount" INTEGER NOT NULL DEFAULT 0,
    "phasesCount" INTEGER NOT NULL DEFAULT 0,
    "submissionDeadline" TIMESTAMPTZ(3),
    "daysToDeadline" INTEGER,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "project_read_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phase_configs" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "fromPhase" "PhaseType" NOT NULL,
    "toPhase" "PhaseType" NOT NULL,
    "rules" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phase_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" UUID NOT NULL,
    "aggregateId" UUID NOT NULL,
    "aggregateType" VARCHAR(50) NOT NULL DEFAULT 'Project',
    "version" INTEGER NOT NULL,
    "state" JSONB NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "aggregateId" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "metadata" JSONB,
    "uploadedBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_records" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reference" VARCHAR(200),
    "recordDate" TIMESTAMPTZ(3) NOT NULL,
    "notes" TEXT,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funding_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_cnaes" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_cnaes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_socios_qsa" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "qualificacao" VARCHAR(150),
    "paisOrigem" VARCHAR(100),
    "nomeRepresentante" VARCHAR(200),
    "qualificacaoRepresentante" VARCHAR(150),
    "faixaEtaria" VARCHAR(50),
    "dataEntrada" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_socios_qsa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cnpj_lookups" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID,
    "cnpj" VARCHAR(18) NOT NULL,
    "queriedByUserId" UUID,
    "source" VARCHAR(30) NOT NULL,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "resultHash" CHAR(64) NOT NULL,
    "rawResponse" JSONB NOT NULL,
    "analysis" JSONB,
    "queriedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "cnpj_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_cnpj_key" ON "organizations"("cnpj");

-- CreateIndex
CREATE INDEX "organizations_cnpj_idx" ON "organizations"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_email_idx" ON "users"("organizationId", "email");

-- CreateIndex
CREATE INDEX "users_organizationId_role_idx" ON "users"("organizationId", "role");

-- CreateIndex
CREATE INDEX "clients_organizationId_name_idx" ON "clients"("organizationId", "name");

-- CreateIndex
CREATE INDEX "clients_organizationId_verifiedAt_idx" ON "clients"("organizationId", "verifiedAt");

-- CreateIndex
CREATE INDEX "clients_organizationId_sector_idx" ON "clients"("organizationId", "sector");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organizationId_cnpj_key" ON "clients"("organizationId", "cnpj");

-- CreateIndex
CREATE INDEX "events_organizationId_createdAt_idx" ON "events"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "events_aggregateId_createdAt_idx" ON "events"("aggregateId", "createdAt");

-- CreateIndex
CREATE INDEX "events_type_createdAt_idx" ON "events"("type", "createdAt");

-- CreateIndex
CREATE INDEX "events_hash_idx" ON "events"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "events_aggregateId_version_key" ON "events"("aggregateId", "version");

-- CreateIndex
CREATE INDEX "projects_organizationId_status_idx" ON "projects"("organizationId", "status");

-- CreateIndex
CREATE INDEX "projects_organizationId_currentPhase_idx" ON "projects"("organizationId", "currentPhase");

-- CreateIndex
CREATE INDEX "projects_clientId_status_idx" ON "projects"("clientId", "status");

-- CreateIndex
CREATE INDEX "projects_submissionDeadline_idx" ON "projects"("submissionDeadline");

-- CreateIndex
CREATE INDEX "projects_version_idx" ON "projects"("version");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organizationId_code_key" ON "projects"("organizationId", "code");

-- CreateIndex
CREATE INDEX "project_read_models_organizationId_phase_idx" ON "project_read_models"("organizationId", "phase");

-- CreateIndex
CREATE INDEX "project_read_models_organizationId_status_idx" ON "project_read_models"("organizationId", "status");

-- CreateIndex
CREATE INDEX "project_read_models_daysToDeadline_idx" ON "project_read_models"("daysToDeadline");

-- CreateIndex
CREATE INDEX "phase_configs_fromPhase_toPhase_isActive_idx" ON "phase_configs"("fromPhase", "toPhase", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "phase_configs_organizationId_fromPhase_toPhase_version_key" ON "phase_configs"("organizationId", "fromPhase", "toPhase", "version");

-- CreateIndex
CREATE INDEX "snapshots_aggregateId_version_idx" ON "snapshots"("aggregateId", "version");

-- CreateIndex
CREATE INDEX "snapshots_aggregateType_createdAt_idx" ON "snapshots"("aggregateType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "snapshots_aggregateId_version_key" ON "snapshots"("aggregateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_eventId_key" ON "outbox"("eventId");

-- CreateIndex
CREATE INDEX "outbox_processed_createdAt_idx" ON "outbox"("processed", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_aggregateId_idx" ON "outbox"("aggregateId");

-- CreateIndex
CREATE INDEX "outbox_type_processed_idx" ON "outbox"("type", "processed");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storageKey_key" ON "documents"("storageKey");

-- CreateIndex
CREATE INDEX "documents_projectId_createdAt_idx" ON "documents"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "funding_records_projectId_recordDate_idx" ON "funding_records"("projectId", "recordDate");

-- CreateIndex
CREATE INDEX "client_cnaes_clientId_isPrimary_idx" ON "client_cnaes"("clientId", "isPrimary");

-- CreateIndex
CREATE INDEX "client_cnaes_codigo_idx" ON "client_cnaes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "client_cnaes_clientId_codigo_isPrimary_key" ON "client_cnaes"("clientId", "codigo", "isPrimary");

-- CreateIndex
CREATE INDEX "client_socios_qsa_clientId_idx" ON "client_socios_qsa"("clientId");

-- CreateIndex
CREATE INDEX "client_socios_qsa_nome_idx" ON "client_socios_qsa"("nome");

-- CreateIndex
CREATE INDEX "cnpj_lookups_organizationId_cnpj_queriedAt_idx" ON "cnpj_lookups"("organizationId", "cnpj", "queriedAt");

-- CreateIndex
CREATE INDEX "cnpj_lookups_cnpj_expiresAt_idx" ON "cnpj_lookups"("cnpj", "expiresAt");

-- CreateIndex
CREATE INDEX "cnpj_lookups_clientId_queriedAt_idx" ON "cnpj_lookups"("clientId", "queriedAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_configs" ADD CONSTRAINT "phase_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_cnaes" ADD CONSTRAINT "client_cnaes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_socios_qsa" ADD CONSTRAINT "client_socios_qsa_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cnpj_lookups" ADD CONSTRAINT "cnpj_lookups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cnpj_lookups" ADD CONSTRAINT "cnpj_lookups_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
