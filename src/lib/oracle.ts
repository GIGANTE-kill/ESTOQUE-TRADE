import oracledb from "oracledb";

// ─────────────────────────────────────────────────────────────
// Conexão Oracle (DW TRADEMARKETING — SROQUEWTPDB)
// Fonte do sell-out (PM_FATURAMENTO). Acesso somente leitura.
// Thin mode: não exige Oracle Instant Client (Oracle 12.1+).
// ─────────────────────────────────────────────────────────────

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const globalForOracle = globalThis as unknown as {
  oraclePool: oracledb.Pool | undefined;
};

async function getPool(): Promise<oracledb.Pool> {
  if (globalForOracle.oraclePool) return globalForOracle.oraclePool;

  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const connectString = process.env.DB_CONNECT_STRING;

  if (!user || !password || !connectString) {
    throw new Error(
      "Credenciais Oracle ausentes no .env (DB_USER, DB_PASSWORD, DB_CONNECT_STRING)"
    );
  }

  globalForOracle.oraclePool = await oracledb.createPool({
    user,
    password,
    connectString,
    poolMin: 0,
    poolMax: 4,
    poolTimeout: 60,
  });

  return globalForOracle.oraclePool;
}

/**
 * Executa um SELECT no Oracle e devolve as linhas como objetos.
 * Conexão é sempre devolvida ao pool no finally.
 */
export async function oracleQuery<T = Record<string, unknown>>(
  sql: string,
  binds: oracledb.BindParameters = {}
): Promise<T[]> {
  const pool = await getPool();
  let conn: oracledb.Connection | undefined;
  try {
    conn = await pool.getConnection();
    const result = await conn.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return (result.rows ?? []) as T[];
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error("[Oracle] erro ao fechar conexão:", e);
      }
    }
  }
}
