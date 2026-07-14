-- CreateEnum
CREATE TYPE "AppLocale" AS ENUM ('EN', 'TR', 'AZ', 'RU');

-- AlterTable
ALTER TABLE "email_outbox" ADD COLUMN     "locale" "AppLocale" NOT NULL DEFAULT 'EN';

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "locale" "AppLocale" NOT NULL DEFAULT 'EN';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "preferredLocale" "AppLocale" NOT NULL DEFAULT 'EN';
