-- CreateEnum
CREATE TYPE "CommercialStatus" AS ENUM ('NEW', 'IN_DISCUSSION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('NEW', 'IN_DISCUSSION', 'QUOTED', 'WON', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommercialQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BusinessDocumentScope" AS ENUM ('EVENT', 'CLIENT', 'USER', 'COMPANY');

-- CreateEnum
CREATE TYPE "BusinessDocumentType" AS ENUM ('QUOTE', 'INVOICE', 'RECEIPT', 'CONTRACT', 'TECHNICAL_SHEET', 'PHOTO', 'ADMINISTRATIVE', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "BusinessDocumentStatus" AS ENUM ('DRAFT', 'PENDING_VALIDATION', 'APPROVED', 'REJECTED', 'SIGNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportExportFormat" AS ENUM ('PDF', 'EXCEL');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SERVICE_REQUEST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'QUOTE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'QUOTE_STATUS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_EXCHANGE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_VALIDATED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_EXPORTED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COMMERCIAL_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'REPORT_READY';

-- CreateTable
CREATE TABLE "CommercialClient" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "source" TEXT,
    "status" "CommercialStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "eventId" TEXT,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "expectedBudgetFcfa" INTEGER,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'NEW',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialQuote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestId" TEXT,
    "eventId" TEXT,
    "createdById" TEXT,
    "quoteNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountFcfa" INTEGER NOT NULL,
    "status" "CommercialQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientExchange" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "notes" TEXT NOT NULL,
    "exchangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientExchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "eventId" TEXT,
    "clientId" TEXT,
    "userId" TEXT,
    "uploadedById" TEXT,
    "validatedById" TEXT,
    "scope" "BusinessDocumentScope" NOT NULL,
    "type" "BusinessDocumentType" NOT NULL DEFAULT 'OTHER',
    "status" "BusinessDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "templateName" TEXT,
    "logoIncluded" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "generatedById" TEXT,
    "title" TEXT NOT NULL,
    "format" "ReportExportFormat" NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "fileUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommercialClient_status_idx" ON "CommercialClient"("status");
CREATE INDEX "CommercialClient_companyId_idx" ON "CommercialClient"("companyId");
CREATE INDEX "ServiceRequest_clientId_idx" ON "ServiceRequest"("clientId");
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");
CREATE UNIQUE INDEX "CommercialQuote_quoteNumber_key" ON "CommercialQuote"("quoteNumber");
CREATE INDEX "CommercialQuote_clientId_idx" ON "CommercialQuote"("clientId");
CREATE INDEX "CommercialQuote_status_idx" ON "CommercialQuote"("status");
CREATE INDEX "ClientExchange_clientId_idx" ON "ClientExchange"("clientId");
CREATE INDEX "BusinessDocument_scope_idx" ON "BusinessDocument"("scope");
CREATE INDEX "BusinessDocument_status_idx" ON "BusinessDocument"("status");
CREATE INDEX "BusinessDocument_eventId_idx" ON "BusinessDocument"("eventId");
CREATE INDEX "BusinessDocument_clientId_idx" ON "BusinessDocument"("clientId");
CREATE INDEX "BusinessDocument_userId_idx" ON "BusinessDocument"("userId");

-- AddForeignKey
ALTER TABLE "CommercialClient" ADD CONSTRAINT "CommercialClient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialClient" ADD CONSTRAINT "CommercialClient_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CommercialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialQuote" ADD CONSTRAINT "CommercialQuote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CommercialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialQuote" ADD CONSTRAINT "CommercialQuote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialQuote" ADD CONSTRAINT "CommercialQuote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialQuote" ADD CONSTRAINT "CommercialQuote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientExchange" ADD CONSTRAINT "ClientExchange_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CommercialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientExchange" ADD CONSTRAINT "ClientExchange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CommercialClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
