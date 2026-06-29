export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pendingDocs = await prisma.document.findMany({
      where: { status: "AGUARDANDO" },
      include: {
        movement: {
          include: {
            material: true,
            user: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const docNotifs = pendingDocs.map((doc) => ({
      id: doc.id,
      tipo: "ASSINATURA" as const,
      material: doc.movement.material.name,
      quantity: doc.movement.quantity,
      operator: doc.movement.user.name,
      createdAt: doc.createdAt.toISOString(),
      movementId: doc.movement.id,
    }));

    // Liberações de meta recém-geradas (ainda sem comprovante) — viram notificação ativa
    const novasLiberacoes = await prisma.liberacao.findMany({
      where: { status: "LIBERADO", comprovanteUrl: null },
      include: { meta: { select: { recompensa: true } } },
      orderBy: { liberadoEm: "desc" },
      take: 20,
    });

    const liberacaoNotifs = novasLiberacoes.map((l) => ({
      id: l.id,
      tipo: "LIBERACAO" as const,
      material: `${l.nomeCliente} liberou ${l.meta.recompensa}`,
      fornecedor: l.fornecedorNome,
      valor: l.valorAtingido,
      createdAt: l.liberadoEm.toISOString(),
    }));

    const notifications = [...liberacaoNotifs, ...docNotifs];
    return NextResponse.json({ notifications, total: notifications.length });
  } catch (error: any) {
    console.error("Notifications load error:", error);
    return NextResponse.json(
      { error: "Falha ao carregar notificações" },
      { status: 500 }
    );
  }
}
