export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularProjecao, normalizeFornecedor } from "@/lib/projecao";
import { listFornecedoresPrincipais } from "@/lib/sellout";

// GET /api/acoes
// Inteligência de ações: projeção de esgotamento por material em ação,
// com status (RISCO/PARADO/SOBRANDO/OK) e o id do fornecedor principal
// (Oracle) para drill-down dos clientes que mais compram a marca.
export async function GET() {
  try {
    const materiais = await prisma.material.findMany({
      where: { periodoAcaoFim: { not: null }, produtoAlvo: true },
      include: {
        category: { select: { name: true } },
        movements: {
          where: { type: "SAIDA" },
          select: { quantity: true, createdAt: true },
        },
      },
      orderBy: { periodoAcaoFim: "asc" },
    });

    // Mapa normalizado de fornecedores principais (Oracle) para casar nomes.
    // Só consulta o Oracle se houver pelo menos um material com fornecedor preenchido.
    let fornecMap = new Map<string, { id: number; nome: string }>();
    const temFornecedor = materiais.some((m) => !!m.fornecedor);
    if (temFornecedor) {
      try {
        const fornecedores = await listFornecedoresPrincipais();
        fornecMap = new Map(
          fornecedores.map((f) => [normalizeFornecedor(f.nome), { id: f.id, nome: f.nome }])
        );
      } catch (e) {
        console.error("[acoes] não foi possível carregar fornecedores do Oracle:", e);
      }
    }

    const acoes = materiais.map((m) => {
      const projecao = calcularProjecao({
        quantity: m.quantity,
        periodoAcaoInicio: m.periodoAcaoInicio,
        periodoAcaoFim: m.periodoAcaoFim,
        entryDate: m.entryDate,
        saidas: m.movements,
      });

      const fornecOracle = m.fornecedor
        ? fornecMap.get(normalizeFornecedor(m.fornecedor)) ?? null
        : null;

      return {
        id: m.id,
        name: m.name,
        sku: m.sku ?? null,
        category: m.category.name,
        fornecedor: m.fornecedor,
        nomeAcao: m.nomeAcao,
        quantity: m.quantity,
        produtoAlvo: m.produtoAlvo,
        periodoAcaoFim: m.periodoAcaoFim?.toISOString().slice(0, 10) ?? null,
        fornecedorOracleId: fornecOracle?.id ?? null,
        fornecedorOracleNome: fornecOracle?.nome ?? null,
        projecao,
      };
    });

    // Ordena por severidade: RISCO/PARADO primeiro
    const ordem: Record<string, number> = { RISCO: 0, PARADO: 1, OK: 2, SOBRANDO: 3 };
    acoes.sort((a, b) => ordem[a.projecao.status] - ordem[b.projecao.status]);

    const resumo = {
      emRisco: acoes.filter((a) => a.projecao.status === "RISCO").length,
      parados: acoes.filter((a) => a.projecao.status === "PARADO").length,
      sobrando: acoes.filter((a) => a.projecao.status === "SOBRANDO").length,
      ok: acoes.filter((a) => a.projecao.status === "OK").length,
    };

    return NextResponse.json({ acoes, resumo, total: acoes.length });
  } catch (error: any) {
    console.error("Acoes load error:", error);
    return NextResponse.json({ error: "Falha ao carregar inteligência de ações" }, { status: 500 });
  }
}
