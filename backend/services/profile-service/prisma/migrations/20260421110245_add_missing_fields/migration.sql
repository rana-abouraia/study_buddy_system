-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "term" TEXT;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "preferredTimes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sessionLength" TEXT,
ALTER COLUMN "studyStyles" SET DEFAULT ARRAY[]::TEXT[];
