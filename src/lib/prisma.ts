import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  prismaSchemaVer: string | undefined;
};

// Versão do schema — incrementar aqui após todo `prisma generate` para invalidar o singleton.
const SCHEMA_VER = "2026-06-25-v2";
if (globalForPrisma.prismaSchemaVer !== SCHEMA_VER) {
  globalForPrisma.prisma = undefined;
  globalForPrisma.pgPool = undefined;
  globalForPrisma.prismaSchemaVer = SCHEMA_VER;
}

function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
  });
  pool.on("error", (err) => {
    console.error("[Postgres Pool] Erro — recriando pool e cliente Prisma...", err.message);
    globalForPrisma.pgPool = undefined;
    globalForPrisma.prisma = undefined;
  });
  return pool;
}

function makePrisma(): PrismaClient {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = createPool();
  }
  const adapter = new PrismaPg(globalForPrisma.pgPool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getLiveClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = makePrisma();
  }
  return globalForPrisma.prisma;
}

// Proxy: cada acesso a `prisma.xyz` busca o cliente vivo no momento da chamada,
// garantindo que erros de pool que resetam o singleton sejam transparentes.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getLiveClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
