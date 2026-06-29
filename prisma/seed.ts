import "dotenv/config";
import { PrismaClient, Role } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import crypto from "crypto";

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(password + salt).digest("hex");
  return { hash, salt };
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Criando usuários iniciais...\n");

  const users = [
    { name: "Administrador", email: "admin@admin.com",  role: Role.ADMINISTRADOR, password: "admin123"  },
    { name: "Gestor",        email: "gestor@admin.com", role: Role.GESTOR,        password: "gestor123" },
    { name: "Operador",      email: "user@admin.com",   role: Role.OPERADOR,      password: "user123"   },
  ];

  for (const u of users) {
    const { hash, salt } = hashPassword(u.password);
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        name:         u.name,
        email:        u.email,
        role:         u.role,
        passwordHash: hash,
        passwordSalt: salt,
      },
    });
    console.log(`✅ ${u.role}: ${u.email}  /  senha: ${u.password}`);
  }

  console.log("\n🎉 Seed concluído.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Erro no seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
