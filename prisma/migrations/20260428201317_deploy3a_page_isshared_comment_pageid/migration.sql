-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "pageId" TEXT;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Comment_pageId_idx" ON "Comment"("pageId");

-- CreateIndex
CREATE INDEX "Page_documentId_isShared_idx" ON "Page"("documentId", "isShared");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

