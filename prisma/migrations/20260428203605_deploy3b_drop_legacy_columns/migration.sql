-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_documentId_fkey";

-- DropForeignKey
ALTER TABLE "SharedPage" DROP CONSTRAINT "SharedPage_documentId_fkey";

-- DropIndex
DROP INDEX "Comment_documentId_idx";

-- DropIndex
DROP INDEX "Document_isPublic_idx";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "documentId",
ALTER COLUMN "pageId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "content",
DROP COLUMN "isPublic",
DROP COLUMN "pages",
DROP COLUMN "sharedPageIds";

-- DropTable
DROP TABLE "SharedPage";

