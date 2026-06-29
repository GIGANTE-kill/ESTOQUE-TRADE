-- Add imageUrl to categories if not exists (idempotent)
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
