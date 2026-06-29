-- Add dataValidade column to materials table
ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "dataValidade" TIMESTAMP(3);
