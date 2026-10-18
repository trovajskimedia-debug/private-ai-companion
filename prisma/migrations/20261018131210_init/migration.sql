-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'owner',
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 25,
    "bio" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "interests" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT 'sage',
    "skinColor" TEXT NOT NULL DEFAULT '#d4a484',
    "hairColor" TEXT NOT NULL DEFAULT '#342720',
    "hairStyle" TEXT NOT NULL DEFAULT 'long',
    "height" INTEGER NOT NULL DEFAULT 168,
    "build" INTEGER NOT NULL DEFAULT 45,
    "curves" INTEGER NOT NULL DEFAULT 50,
    "outfit" TEXT NOT NULL DEFAULT 'yoga',
    "outfitColor" TEXT NOT NULL DEFAULT '#8276ad',
    "topColor" TEXT NOT NULL DEFAULT '#e8dfd0',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'friendship',
    "points" INTEGER NOT NULL DEFAULT 0,
    "interactions" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Relationship_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "imagePath" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImageJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "promptId" TEXT,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImageJob_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_characterId_key" ON "Relationship"("characterId");

-- CreateIndex
CREATE INDEX "Message_characterId_createdAt_idx" ON "Message"("characterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImageJob_promptId_key" ON "ImageJob"("promptId");

-- CreateIndex
CREATE INDEX "ImageJob_characterId_status_idx" ON "ImageJob"("characterId", "status");
