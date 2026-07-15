-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_UPDATED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "documentFooter" TEXT,
ADD COLUMN     "taxInfo" TEXT;
