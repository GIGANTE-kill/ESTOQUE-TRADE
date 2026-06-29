"use strict";
const crypto = require("crypto");
const { PrismaClient } = require("./src/generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(password + salt).digest("hex");
  return { hash, salt };
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Criando usuários iniciais...\n");

  const users = [
    { name: "Administrador", email: "admin@admin.com",  role: "ADMINISTRADOR", password: "admin123"  },
    { name: "Gestor",        email: "gestor@admin.com", role: "GESTOR",        password: "gestor123" },
    { name: "Operador",      email: "user@admin.com",   role: "OPERADOR",      password: "user123"   },
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
