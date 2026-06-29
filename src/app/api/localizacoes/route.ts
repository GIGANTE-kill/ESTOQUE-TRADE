export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

// GET — lista todas as localizações, incluindo materiais com info de alertas
export async function GET() {
  try {
    const now = new Date();

    const localizacoes = await prisma.localizacao.findMany({
      include: {
        _count: { select: { materials: true } },
        materials: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            photoUrl: true,
            nomeAcao: true,
            periodoAcaoFim: true,
            dataValidade: true,
            status: true,
            fornecedor: true,
          },
        },
      },
    });

    localizacoes.sort((a, b) =>
      naturalCompare(a.rua, b.rua) ||
      naturalCompare(a.predio, b.predio) ||
      naturalCompare(a.andar, b.andar) ||
      naturalCompare(a.apartamento, b.apartamento)
    );

    // Enriquece cada localização com flags de criticidade
    const enriched = localizacoes.map((loc) => {
      let acaoAcabando = false;
      let produtoVencendo = false;

      for (const mat of loc.materials) {
        if (mat.periodoAcaoFim) {
          const dias = Math.ceil((mat.periodoAcaoFim.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (dias >= 0 && dias <= 15) acaoAcabando = true;
        }
        if (mat.dataValidade) {
          const dias = Math.ceil((mat.dataValidade.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (dias >= 0 && dias <= 60) produtoVencendo = true;
        }
      }

      return {
        ...loc,
        acaoAcabando,
        produtoVencendo,
        materials: loc.materials.map((mat) => ({
          ...mat,
          periodoAcaoFim: mat.periodoAcaoFim ? mat.periodoAcaoFim.toISOString().split("T")[0] : null,
          dataValidade: mat.dataValidade ? mat.dataValidade.toISOString().split("T")[0] : null,
          diasRestantesAcao: mat.periodoAcaoFim
            ? Math.ceil((mat.periodoAcaoFim.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null,
          diasParaVencer: mat.dataValidade
            ? Math.ceil((mat.dataValidade.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null,
        })),
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("Localizacoes load error:", error);
    return NextResponse.json({ error: "Falha ao carregar localizações" }, { status: 500 });
  }
}

// POST — cria nova localização
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rua, predio, andar, apartamento } = body;

    if (!rua || !predio || !andar || !apartamento) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios: Rua, Prédio, Andar, Apartamento" },
        { status: 400 }
      );
    }

    const localizacao = await prisma.localizacao.create({
      data: { rua, predio, andar, apartamento },
    });

    return NextResponse.json(localizacao, { status: 201 });
  } catch (error: any) {
    console.error("Localizacao create error:", error);
    return NextResponse.json({ error: error.message || "Falha ao criar localização" }, { status: 500 });
  }
}
