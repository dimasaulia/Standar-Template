/*
  Warnings:

  - You are about to drop the column `isVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Token` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[token]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT "Token_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isVerified",
ADD COLUMN     "accountIsVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailIsVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "token" TEXT,
ADD COLUMN     "tokenExpiredAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "Token";

-- CreateIndex
CREATE UNIQUE INDEX "User_token_key" ON "User"("token");
