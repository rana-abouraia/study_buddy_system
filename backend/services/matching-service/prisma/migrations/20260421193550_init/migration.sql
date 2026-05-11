-- CreateTable
CREATE TABLE "MatchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courses" TEXT[],
    "topics" TEXT[],
    "studyPace" TEXT,
    "studyMode" TEXT,
    "groupSize" INTEGER,
    "studyStyle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateUserId" TEXT NOT NULL,
    "compatibility" DOUBLE PRECISION NOT NULL,
    "reasons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchProfile_userId_key" ON "MatchProfile"("userId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_userId_idx" ON "AvailabilitySlot"("userId");

-- CreateIndex
CREATE INDEX "MatchResult_userId_idx" ON "MatchResult"("userId");

-- CreateIndex
CREATE INDEX "MatchResult_candidateUserId_idx" ON "MatchResult"("candidateUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_userId_candidateUserId_key" ON "MatchResult"("userId", "candidateUserId");

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MatchProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MatchProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_candidateUserId_fkey" FOREIGN KEY ("candidateUserId") REFERENCES "MatchProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
