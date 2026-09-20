/*
  Warnings:

  - You are about to drop the column `createdAt` on the `delivery_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `errorCode` on the `delivery_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `jobId` on the `delivery_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `latencyMs` on the `delivery_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `delivery_attempts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[job_id,attempt]` on the table `delivery_attempts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `job_id` to the `delivery_attempts` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "delivery_attempts_jobId_attempt_key";

-- DropIndex
DROP INDEX "delivery_attempts_jobId_idx";

-- AlterTable
ALTER TABLE "delivery_attempts" DROP COLUMN "createdAt",
DROP COLUMN "errorCode",
DROP COLUMN "jobId",
DROP COLUMN "latencyMs",
DROP COLUMN "messageId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "error_code" TEXT,
ADD COLUMN     "job_id" TEXT NOT NULL,
ADD COLUMN     "latency_ms" INTEGER,
ADD COLUMN     "message_id" TEXT;

-- CreateIndex
CREATE INDEX "delivery_attempts_job_id_idx" ON "delivery_attempts"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_attempts_job_id_attempt_key" ON "delivery_attempts"("job_id", "attempt");
