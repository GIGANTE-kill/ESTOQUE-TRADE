/**
 * migrate-to-oracle.js
 * Migra dados do PostgreSQL (Prisma) para o Oracle (schema ET_)
 *
 * Pré-requisitos:
 *   1. Oracle Instant Client instalado e no PATH (ou LD_LIBRARY_PATH / PATH)
 *   2. npm install oracledb  (ou yarn add oracledb)
 *   3. Variáveis no .env preenchidas:
 *      DATABASE_URL, DB_WRITE_USER, DB_WRITE_PASSWORD, DB_HOST, DB_PORT, DB_SERVICE
 *   4. DDL já executado no Oracle (scripts/oracle-schema-ET.sql)
 *
 * Executar:
 *   node scripts/migrate-to-oracle.js
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool }    = require('pg');
const oracledb    = require('oracledb');

// ─── Configurações ──────────────────────────────────────────────────────────

const PG_URL = process.env.DATABASE_URL;
if (!PG_URL) { console.error('[ERRO] DATABASE_URL não definida no .env'); process.exit(1); }

const ORA_USER    = process.env.DB_WRITE_USER;
const ORA_PASS    = process.env.DB_WRITE_PASSWORD;
const ORA_CONNECT = process.env.DB_CONNECT_STRING;

if (!ORA_USER || !ORA_PASS || !ORA_CONNECT) {
  console.error('[ERRO] Credenciais Oracle incompletas no .env');
  console.error('       Necessário: DB_WRITE_USER, DB_WRITE_PASSWORD, DB_CONNECT_STRING');
  process.exit(1);
}

// Thin mode — não precisa de Oracle Client instalado (Oracle 12.1+)
oracledb.initOracleClient = undefined; // usa thin mode por padrão em versões >= 6.0
oracledb.outFormat        = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit       = false;

const BATCH = 200; // registros por commit

// ─── Helpers ────────────────────────────────────────────────────────────────

const pg = new Pool({ connectionString: PG_URL });

function ts(d) {
  // Converte Date JS → objeto Date aceito pelo oracledb
  return d ? new Date(d) : null;
}

function str(v, max = 4000) {
  if (v == null) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

async function insertBatch(conn, table, sql, rows, buildBinds) {
  if (!rows.length) {
    console.log(`  [skip] ${table} — nenhum registro`);
    return;
  }
  let count = 0;
  for (const row of rows) {
    await conn.execute(sql, buildBinds(row), { autoCommit: false });
    count++;
    if (count % BATCH === 0) {
      await conn.commit();
      process.stdout.write(`\r  [${table}] ${count}/${rows.length}...`);
    }
  }
  await conn.commit();
  console.log(`\r  [ok] ${table} — ${count} registro(s) migrado(s)         `);
}

// ─── Migração por tabela ─────────────────────────────────────────────────────

async function migrateUsuarios(pg, ora) {
  const { rows } = await pg.query('SELECT * FROM users ORDER BY "createdAt"');

  const sql = `
    MERGE INTO ET_USUARIOS t
    USING (SELECT :id AS ID FROM DUAL) s ON (t.ID = s.ID)
    WHEN NOT MATCHED THEN INSERT
      (ID, NOME, EMAIL, PERFIL, AVATAR_URL, SENHA_HASH, SENHA_SALT, DT_CRIACAO, DT_ATUALIZACAO)
    VALUES
      (:id, :nome, :email, :perfil, :avatar_url, :senha_hash, :senha_salt, :dt_criacao, :dt_atualizacao)
  `;

  await insertBatch(ora, 'ET_USUARIOS', sql, rows, (r) => ({
    id:            str(r.id, 36),
    nome:          str(r.name, 255),
    email:         str(r.email, 255),
    perfil:        str(r.role, 20),
    avatar_url:    str(r.avatarUrl, 1000),
    senha_hash:    str(r.passwordHash, 500),
    senha_salt:    str(r.passwordSalt, 255),
    dt_criacao:    ts(r.createdAt),
    dt_atualizacao: ts(r.updatedAt),
  }));
}

async function migrateCategorias(pg, ora) {
  // Apenas categorias que existem — deletadas já não aparecem aqui
  const { rows } = await pg.query('SELECT * FROM categories ORDER BY "createdAt"');

  const sql = `
    MERGE INTO ET_CATEGORIAS t
    USING (SELECT :id AS ID FROM DUAL) s ON (t.ID = s.ID)
    WHEN NOT MATCHED THEN INSERT
      (ID, NOME, IMAGEM_URL, DT_CRIACAO)
    VALUES
      (:id, :nome, :imagem_url, :dt_criacao)
  `;

  await insertBatch(ora, 'ET_CATEGORIAS', sql, rows, (r) => ({
    id:         str(r.id, 36),
    nome:       str(r.name, 255),
    imagem_url: str(r.imageUrl, 1000),
    dt_criacao: ts(r.createdAt),
  }));
}

async function migrateLocalizacoes(pg, ora) {
  const { rows } = await pg.query('SELECT * FROM localizacoes ORDER BY "createdAt"');

  const sql = `
    MERGE INTO ET_LOCALIZACOES t
    USING (SELECT :id AS ID FROM DUAL) s ON (t.ID = s.ID)
    WHEN NOT MATCHED THEN INSERT
      (ID, RUA, PREDIO, ANDAR, APARTAMENTO, DT_CRIACAO)
    VALUES
      (:id, :rua, :predio, :andar, :apartamento, :dt_criacao)
  `;

  await insertBatch(ora, 'ET_LOCALIZACOES', sql, rows, (r) => ({
    id:          str(r.id, 36),
    rua:         str(r.rua, 100),
    predio:      str(r.predio, 100),
    andar:       str(r.andar, 100),
    apartamento: str(r.apartamento, 100),
    dt_criacao:  ts(r.createdAt),
  }));
}

async function migrateMarcadores(pg, ora) {
  const { rows } = await pg.query('SELECT * FROM marcadores ORDER BY "createdAt"');

  const sql = `
    MERGE INTO ET_MARCADORES t
    USING (SELECT :id AS ID FROM DUAL) s ON (t.ID = s.ID)
    WHEN NOT MATCHED THEN INSERT
      (ID, NOME, COR, DT_CRIACAO)
    VALUES
      (:id, :nome, :cor, :dt_criacao)
  `;

  await insertBatch(ora, 'ET_MARCADORES', sql, rows, (r) => ({
    id:         str(r.id, 36),
    nome:       str(r.name, 255),
    cor:        str(r.color, 20),
    dt_criacao: ts(r.createdAt),
  }));
}

async function migrateMateriais(pg, ora) {
  const { rows } = await pg.query('SELECT * FROM materials ORDER BY "createdAt"');

  const sql = `
    MERGE INTO ET_MATERIAIS t
    USING (SELECT :id AS ID FROM DUAL) s ON (t.ID = s.ID)
    WHEN NOT MATCHED THEN INSERT (
      ID, NOME, SKU, CATEGORIA_ID, QUANTIDADE, CUSTO_UNITARIO,
      DT_ENTRADA, STATUS, FORNECEDOR, NOME_ACAO,
      PERIODO_ACAO_INICIO, PERIODO_ACAO_FIM, DATA_VALIDADE,
      FOTO_URL, LOCALIZACAO_ID, DT_CRIACAO, DT_ATUALIZACAO
    ) VALUES (
      :id, :nome, :sku, :categoria_id, :quantidade, :custo_unitario,
      :dt_entrada, :status, :fornecedor, :nome_acao,
      :periodo_acao_inicio, :periodo_acao_fim, :data_validade,
      :foto_url, :localizacao_id, :dt_criacao, :dt_atualizacao
    )
  `;

  await insertBatch(ora, 'ET_MATERIAIS', sql, rows, (r) => ({
    id:                  str(r.id, 36),
    nome:                str(r.name, 500),
    sku:                 str(r.sku, 255),
    categoria_id:        str(r.categoryId, 36),
    quantidade:          r.quantity ?? 0,
    custo_unitario:      r.unitCost ?? null,
    dt_entrada:          ts(r.entryDate),
    status:              str(r.status, 20),
    fornecedor:          str(r.fornecedor, 500),
    nome_acao:           str(r.nomeAcao, 500),
    periodo_acao_inicio: ts(r.periodoAcaoInicio),
    periodo_acao_fim:    ts(r.periodoAcaoFim),
    data_validade:       ts(r.dataValidade),
    foto_url:            str(r.photoUrl, 1000),
    localizacao_id:      str(r.localizacaoId, 36),
    dt_criacao:          ts(r.createdAt),
    dt_atualizacao:      ts(r.updatedAt),
  }));
}

async function migrateMovimentacoes(pg, ora) {
  const { rows } = await pg.query('SELECT * FROM movements ORDER BY "createdAt"');

  const sql = `
    MERGE INTO ET_MOVIMENTACOES t
    USING (SELECT :id AS ID FROM DUAL) s ON (t.ID = s.ID)
    WHEN NOT MATCHED THEN INSERT
      (ID, TIPO, QUANTIDADE, MATERIAL_ID, USUARIO_ID, OBSERVACOES, DT_CRIACAO)
    VALUES
      (:id, :tipo, :quantidade, :material_id, :usuario_id, :observacoes, :dt_criacao)
  `;

  await insertBatch(ora, 'ET_MOVIMENTACOES', sql, rows, (r) => ({
    id:          str(r.id, 36),
    tipo:        str(r.type, 10),
    quantidade:  r.quantity,
    material_id: str(r.materialId, 36),
    usuario_id:  str(r.userId, 36),
    observacoes: str(r.notes, 4000),
    dt_criacao:  ts(r.createdAt),
  }));
}

async function migrateDocumentos(pg, ora) {
  const { rows } = await pg.query('SELECT * FROM documents ORDER BY "createdAt"');

  const sql = `
    MERGE INTO ET_DOCUMENTOS t
    USING (SELECT :id AS ID FROM DUAL) s ON (t.ID = s.ID)
    WHEN NOT MATCHED THEN INSERT (
      ID, MOVIMENTACAO_ID, DT_ASSINATURA, ASSINADO_POR,
      STATUS, URL_ARQUIVO, URL_DOC_ASSIN, OBSERVACOES,
      DT_CRIACAO, DT_ATUALIZACAO
    ) VALUES (
      :id, :movimentacao_id, :dt_assinatura, :assinado_por,
      :status, :url_arquivo, :url_doc_assin, :observacoes,
      :dt_criacao, :dt_atualizacao
    )
  `;

  await insertBatch(ora, 'ET_DOCUMENTOS', sql, rows, (r) => ({
    id:              str(r.id, 36),
    movimentacao_id: str(r.movementId, 36),
    dt_assinatura:   ts(r.signedAt),
    assinado_por:    str(r.signedBy, 255),
    status:          str(r.status, 20),
    url_arquivo:     str(r.fileUrl, 1000),
    url_doc_assin:   str(r.signedDocUrl, 1000),
    observacoes:     str(r.notes, 4000),
    dt_criacao:      ts(r.createdAt),
    dt_atualizacao:  ts(r.updatedAt),
  }));
}

async function migrateSolicitacoes(pg, ora) {
  const { rows } = await pg.query('SELECT * FROM solicitacoes ORDER BY "createdAt"');

  const sql = `
    MERGE INTO ET_SOLICITACOES t
    USING (SELECT :id AS ID FROM DUAL) s ON (t.ID = s.ID)
    WHEN NOT MATCHED THEN INSERT (
      ID, MATERIAL_ID, SOLICITANTE_ID, QUANTIDADE, JUSTIFICATIVA,
      STATUS, APROVADOR_ID, DT_APROVACAO, MOVIMENTACAO_ID,
      URL_DOC_ASSIN, OBSERVACOES, MARCADOR_ID, DT_CRIACAO, DT_ATUALIZACAO
    ) VALUES (
      :id, :material_id, :solicitante_id, :quantidade, :justificativa,
      :status, :aprovador_id, :dt_aprovacao, :movimentacao_id,
      :url_doc_assin, :observacoes, :marcador_id, :dt_criacao, :dt_atualizacao
    )
  `;

  await insertBatch(ora, 'ET_SOLICITACOES', sql, rows, (r) => ({
    id:              str(r.id, 36),
    material_id:     str(r.materialId, 36),
    solicitante_id:  str(r.solicitanteId, 36),
    quantidade:      r.quantity,
    justificativa:   str(r.justificativa, 4000),
    status:          str(r.status, 20),
    aprovador_id:    str(r.aprovadorId, 36),
    dt_aprovacao:    ts(r.aprovadoEm),
    movimentacao_id: str(r.movementId, 36),
    url_doc_assin:   str(r.signedDocUrl, 1000),
    observacoes:     str(r.notes, 4000),
    marcador_id:     str(r.marcadorId, 36),
    dt_criacao:      ts(r.createdAt),
    dt_atualizacao:  ts(r.updatedAt),
  }));
}

// ─── Contagem final ──────────────────────────────────────────────────────────

async function countOra(conn, table) {
  const res = await conn.execute(`SELECT COUNT(*) AS N FROM ${table}`);
  return res.rows[0].N;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  let pgClient, ora;

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log(' MIGRAÇÃO PostgreSQL → Oracle  (schema ET_)            ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\nOracle: ${ORA_USER}@SROQUEWTPDB (load balance 3 nodes)`);

    pgClient = await pg.connect();
    console.log('PostgreSQL: conectado ✓');

    ora = await oracledb.getConnection({ user: ORA_USER, password: ORA_PASS, connectString: ORA_CONNECT });
    console.log('Oracle: conectado ✓\n');

    // Ordem respeita dependências de FK
    console.log('── Migrando tabelas ──────────────────────────────────');
    await migrateUsuarios(pgClient, ora);
    await migrateCategorias(pgClient, ora);   // apenas categorias ativas
    await migrateLocalizacoes(pgClient, ora);
    await migrateMarcadores(pgClient, ora);
    await migrateMateriais(pgClient, ora);
    await migrateMovimentacoes(pgClient, ora);
    await migrateDocumentos(pgClient, ora);
    await migrateSolicitacoes(pgClient, ora);

    // Resumo
    console.log('\n── Totais no Oracle ──────────────────────────────────');
    const tables = [
      'ET_USUARIOS','ET_CATEGORIAS','ET_LOCALIZACOES','ET_MARCADORES',
      'ET_MATERIAIS','ET_MOVIMENTACOES','ET_DOCUMENTOS','ET_SOLICITACOES'
    ];
    for (const t of tables) {
      const n = await countOra(ora, t);
      console.log(`  ${t.padEnd(22)} ${n} registros`);
    }

    console.log('\n[CONCLUÍDO] Migração finalizada com sucesso.\n');

  } catch (err) {
    console.error('\n[ERRO] Migração interrompida:');
    console.error(err.message || err);
    process.exitCode = 1;
  } finally {
    if (pgClient) pgClient.release();
    if (ora)      await ora.close();
    await pg.end();
  }
}

main();
