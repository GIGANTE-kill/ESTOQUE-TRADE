import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────
// Cache persistente no PostgreSQL para resultados de queries Oracle.
//
// Vantagens sobre o Map em memória:
//   • Sobrevive a reinicializações do servidor (hot-reload, deploy)
//   • Compartilhado entre todos os workers do Node.js
//   • Inspecionável via psql / pgAdmin para debugging
//
// Uso:
//   const cached = await getCache<T>("minha-chave");
//   if (cached) return cached;
//   const data = await queryOracle();
//   await setCache("minha-chave", data, 10 * 60 * 1000); // TTL 10 min
//   return data;
// ─────────────────────────────────────────────────────────────

/**
 * Busca o valor cacheado para `key` se ele ainda não expirou.
 * Retorna `undefined` se não existir ou se o TTL tiver vencido.
 */
export async function getCache<T>(key: string): Promise<T | undefined> {
  try {
    const row = await prisma.oracleCache.findUnique({ where: { key } });
    if (!row) return undefined;
    if (row.expiresAt <= new Date()) {
      // Expirado — deleta de forma assíncrona para não travar o request
      prisma.oracleCache.delete({ where: { key } }).catch(() => undefined);
      return undefined;
    }
    return row.payload as T;
  } catch (e) {
    // Se o banco estiver indisponível, deixa passar (query Oracle direta)
    console.warn("[pg-cache] getCache falhou silenciosamente:", (e as Error).message);
    return undefined;
  }
}

/**
 * Salva `data` no cache com o TTL especificado (em milissegundos).
 * Usa upsert para ser idempotente — pode ser chamado múltiplas vezes.
 */
export async function setCache(key: string, data: unknown, ttlMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  try {
    await prisma.oracleCache.upsert({
      where: { key },
      create: { key, payload: data as any, expiresAt },
      update: { payload: data as any, expiresAt },
    });
  } catch (e) {
    // Falha de cache não deve impedir o request
    console.warn("[pg-cache] setCache falhou silenciosamente:", (e as Error).message);
  }
}

/**
 * Invalida manualmente uma chave específica do cache.
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await prisma.oracleCache.delete({ where: { key } }).catch(() => undefined);
  } catch {
    // silencioso
  }
}

/**
 * Invalida todas as entradas cujo key começa com o prefixo dado.
 * Útil para limpar grupos de cache (ex: todas as chaves "pedidos:").
 */
export async function invalidateCacheByPrefix(prefix: string): Promise<number> {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM oracle_cache WHERE key LIKE ${prefix + "%"}
    `;
    return Number(result);
  } catch (e) {
    console.warn("[pg-cache] invalidateCacheByPrefix falhou:", (e as Error).message);
    return 0;
  }
}
