import { prisma } from "@/lib/prisma";
import { CategoriasClient } from "./CategoriasClient";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { materials: true } } },
  });

  return <CategoriasClient initialCategories={categories as any} />;
}
