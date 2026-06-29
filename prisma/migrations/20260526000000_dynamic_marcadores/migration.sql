-- CreateTable: marcadores (dynamic labels with custom colors)
CREATE TABLE IF NOT EXISTS "marcadores" (
  "id"        TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "color"     TEXT        NOT NULL DEFAULT '#6366f1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marcadores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "marcadores_name_key" UNIQUE ("name")
);

-- Seed the three default marcadores with stable IDs
INSERT INTO "marcadores" ("id", "name", "color") VALUES
  ('marcador_brinde',   'Brinde Normal',          '#8b5cf6'),
  ('marcador_trade',    'Ação de Trade',           '#3b82f6'),
  ('marcador_condicao', 'Condição para Compra',    '#f59e0b')
ON CONFLICT ("id") DO NOTHING;

-- Add marcadorId FK column to solicitacoes
ALTER TABLE "solicitacoes" ADD COLUMN IF NOT EXISTS "marcadorId" TEXT;

-- Migrate existing enum values to FK references (legacy column already dropped in prod)
-- UPDATE statements omitted: column 'marcador' no longer exists after migration.

-- Add foreign key constraint (skip if already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'solicitacoes_marcadorId_fkey'
  ) THEN
    ALTER TABLE "solicitacoes"
      ADD CONSTRAINT "solicitacoes_marcadorId_fkey"
      FOREIGN KEY ("marcadorId") REFERENCES "marcadores"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Drop old enum column
ALTER TABLE "solicitacoes" DROP COLUMN IF EXISTS "marcador";

-- Drop enum type (safe: only after column is dropped)
DROP TYPE IF EXISTS "SolicitacaoMarcador";
