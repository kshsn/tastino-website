-- CreateEnum
CREATE TYPE "SlugKind" AS ENUM ('BRAND', 'PRODUCT');

-- CreateTable
CREATE TABLE "SlugRedirect" (
    "id" TEXT NOT NULL,
    "kind" "SlugKind" NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "targetSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlugRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlugRedirect_kind_oldSlug_key" ON "SlugRedirect"("kind", "oldSlug");
