import { prisma } from "./src/lib/prisma";

export default async function TestDB() {
  console.log("DB URL inside test-db:", process.env.DATABASE_URL);
  const materials = await prisma.material.findMany();
  console.log(materials);
}
TestDB().catch(console.error);
