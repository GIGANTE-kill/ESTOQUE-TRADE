-- CreateTable: localizacoes (warehouse locations)
CREATE TABLE IF NOT EXISTS "localizacoes" (
  "id"          TEXT        NOT NULL,
  "rua"         TEXT        NOT NULL,
  "predio"      TEXT        NOT NULL,
  "andar"       TEXT        NOT NULL,
  "apartamento" TEXT        NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "localizacoes_pkey" PRIMARY KEY ("id")
);

-- Add localizacaoId FK column to materials
ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "localizacaoId" TEXT;

-- Add foreign key constraint (skip if already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'materials_localizacaoId_fkey'
  ) THEN
    ALTER TABLE "materials"
      ADD CONSTRAINT "materials_localizacaoId_fkey"
      FOREIGN KEY ("localizacaoId") REFERENCES "localizacoes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
