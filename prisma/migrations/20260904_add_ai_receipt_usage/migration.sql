-- CreateTable
CREATE TABLE "AiReceiptUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "parseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiReceiptUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiReceiptUsage_userId_idx" ON "AiReceiptUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiReceiptUsage_userId_periodStart_key" ON "AiReceiptUsage"("userId", "periodStart");

-- AddForeignKey
ALTER TABLE "AiReceiptUsage" ADD CONSTRAINT "AiReceiptUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
