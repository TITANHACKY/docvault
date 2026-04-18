-- CreateTable
CREATE TABLE "VaultBlob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blob" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultBlob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VaultBlob_userId_key" ON "VaultBlob"("userId");

-- AddForeignKey
ALTER TABLE "VaultBlob" ADD CONSTRAINT "VaultBlob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
