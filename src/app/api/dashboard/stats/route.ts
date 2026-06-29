export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Todas as queries em paralelo
    const [materials, monthlyMovements, pendingSignatures, recentMovements] = await Promise.all([
      prisma.material.findMany({ select: { quantity: true, entryDate: true } }),
      prisma.movement.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.document.count({ where: { status: "AGUARDANDO" } }),
      prisma.movement.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { type: true, quantity: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // 1. Total items
    const totalItems = materials.reduce((acc, m) => acc + m.quantity, 0);

    // 3. Average days in stock
    let totalDays = 0;
    let countWithEntryDate = 0;
    for (const m of materials) {
      if (m.entryDate) {
        const diffTime = Math.abs(now.getTime() - new Date(m.entryDate).getTime());
        totalDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        countWithEntryDate++;
      }
    }
    const avgDaysInStock = countWithEntryDate > 0 ? Math.round(totalDays / countWithEntryDate) : 0;

    // Format weekly chart data
    const chartMap = new Map<string, { name: string; entradas: number; saidas: number }>();
    // Pre-fill last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      chartMap.set(label, { name: label.toUpperCase(), entradas: 0, saidas: 0 });
    }

    for (const move of recentMovements) {
      const label = new Date(move.createdAt)
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", "");
      if (chartMap.has(label)) {
        const current = chartMap.get(label)!;
        if (move.type === "ENTRADA") {
          current.entradas += move.quantity;
        } else {
          current.saidas += move.quantity;
        }
      }
    }

    const chartData = Array.from(chartMap.values());

    return NextResponse.json({
      totalItems,
      monthlyMovements,
      avgDaysInStock,
      pendingSignatures,
      chartData,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: error.message || "Failed to load dashboard statistics" }, { status: 500 });
  }
}
