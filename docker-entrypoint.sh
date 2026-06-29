#!/bin/sh
set -e

# Extrai host e porta da DATABASE_URL para o healthcheck
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_PORT=${DB_PORT:-5432}

echo "→ Aguardando PostgreSQL em $DB_HOST:$DB_PORT..."
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  sleep 1
done
echo "→ PostgreSQL disponível."

PRISMA="node node_modules/prisma/build/index.js"

echo "→ Resolvendo migrations com falha (se houver)..."

# Usa DATABASE_URL diretamente para evitar problemas com senhas que contêm caracteres especiais
MARCADORES_EXISTS=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='marcadores';" 2>&1 || echo "ERR")

echo "→ Verificação tabela 'marcadores': [$MARCADORES_EXISTS]"

if [ "$MARCADORES_EXISTS" = "1" ]; then
  echo "→ Tabela 'marcadores' já existe — marcando migration como aplicada..."
  $PRISMA migrate resolve --applied 20260526000000_dynamic_marcadores 2>/dev/null || true
else
  echo "→ Tabela 'marcadores' não encontrada (resultado: $MARCADORES_EXISTS) — marcando como rolled-back..."
  $PRISMA migrate resolve --rolled-back 20260526000000_dynamic_marcadores 2>/dev/null || true
fi

# Demais migrations — marca como rolled-back apenas (não criam conflito)
$PRISMA migrate resolve --rolled-back 20240101000000_init              2>/dev/null || true
$PRISMA migrate resolve --rolled-back 20260521000000_init              2>/dev/null || true
$PRISMA migrate resolve --rolled-back 20260521000001_seed_data         2>/dev/null || true

echo "→ Aplicando migrations..."
$PRISMA migrate deploy

echo "→ Rodando seed (upsert — seguro repetir)..."
node seed.js || echo "⚠️  Seed falhou, continuando..."

echo "→ Iniciando aplicação..."
exec node server.js
