-- Additive migration: preserve all existing characters, messages, relationships and image jobs.
BEGIN;
ALTER TABLE "Character" ADD COLUMN "profile" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Character" ADD COLUMN "portraitId" TEXT;
ALTER TABLE "Character" ADD COLUMN "portraitSpec" TEXT;
ALTER TABLE "Message" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ImageJob" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'chat';
ALTER TABLE "ImageJob" ADD COLUMN "serverUrl" TEXT;
ALTER TABLE "ImageJob" ADD COLUMN "renderSpec" TEXT;
ALTER TABLE "ImageJob" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
CREATE TABLE "AppSetting" ("key" TEXT NOT NULL PRIMARY KEY, "value" TEXT NOT NULL, "updatedAt" DATETIME NOT NULL);
CREATE TABLE "ReferenceImage" (
 "id" TEXT NOT NULL PRIMARY KEY, "characterId" TEXT NOT NULL, "filename" TEXT NOT NULL,
 "label" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ReferenceImage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReferenceImage_characterId_idx" ON "ReferenceImage"("characterId");
COMMIT;
