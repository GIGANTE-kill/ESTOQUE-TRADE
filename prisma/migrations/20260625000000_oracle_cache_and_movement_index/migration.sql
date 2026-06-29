-- Migration: oracle_cache + movement index
-- Applied directly via prisma db execute (shadow DB incompatible with legacy migration drift)

-- Create oracle_cache table for persistent Oracle query results
CREATE TABLE IF NOT EXISTS "oracle_cache" (
  "key"       TEXT         NOT NULL,
  "payload"   JSONB        NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oracle_cache_pkey" PRIMARY KEY ("key")
);

-- Create composite index on movements(materialId, type, createdAt)
-- to speed up SAIDA queries used by Inteligência de Ações
CREATE INDEX IF NOT EXISTS "movements_materialId_type_createdAt_idx"
  ON "movements" ("materialId", "type", "createdAt");
