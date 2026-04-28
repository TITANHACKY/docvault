-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedPage" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Page_documentId_idx" ON "Page"("documentId");

-- CreateIndex
CREATE INDEX "Page_documentId_position_idx" ON "Page"("documentId", "position");

-- CreateIndex
CREATE INDEX "SharedPage_documentId_idx" ON "SharedPage"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedPage_documentId_pageId_key" ON "SharedPage"("documentId", "pageId");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedPage" ADD CONSTRAINT "SharedPage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

