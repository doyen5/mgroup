-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'INTERFACE_PREFERENCES_UPDATED';

-- CreateTable
CREATE TABLE "InterfacePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'fr',
    "primaryColor" TEXT NOT NULL DEFAULT '#159bd3',
    "accentColor" TEXT NOT NULL DEFAULT '#ff8a2a',
    "sidebarStyle" TEXT NOT NULL DEFAULT 'dark',
    "density" TEXT NOT NULL DEFAULT 'comfortable',
    "dateFormat" TEXT NOT NULL DEFAULT 'full',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Abidjan',
    "widgets" JSONB,
    "navigation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterfacePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterfacePreference_userId_key" ON "InterfacePreference"("userId");

-- AddForeignKey
ALTER TABLE "InterfacePreference" ADD CONSTRAINT "InterfacePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
