-- Update TimeTable model
ALTER TABLE "TimeTable" DROP COLUMN "day";
ALTER TABLE "TimeTable" ADD COLUMN "date" TIMESTAMP(3) NOT NULL;
