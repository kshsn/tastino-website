-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "autoReplyStatus" "EmailStatus" NOT NULL DEFAULT 'PENDING';
