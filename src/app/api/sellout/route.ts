export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { selloutPorCliente, pedidosPorFornecedorEClientes } from "@/lib/sellout";

// GET /api/sellout?fornecedorId=123
// Sell-out (SUM FATURAMENTO_3M) por cliente para o fornecedor principal.
// Enriquece com o total de produtos do fornecedor nos pedidos Winthor (30 dias).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fornecedorId = searchParams.get("fornecedorId");
    if (!fornecedorId) {
      return NextResponse.json({ error: "fornecedorId é obrigatório" }, { status: 400 });
    }

    const fId = Number(fornecedorId);
    const clientes = await selloutPorCliente(fId);

    // Soma produtos do fornecedor nos pedidos Winthor (últimos 90 dias)
    let pedidoMap: Record<string, { numPedidos: number; valorTotal: number; ultimoNumped: number }> = {};
    if (clientes.length > 0) {
      try {
        pedidoMap = await pedidosPorFornecedorEClientes(fId, clientes.map((c) => c.codCli));
      } catch (e) {
        console.error("[sellout] erro ao buscar pedidos por fornecedor:", e);
      }
    }

    const enriched = clientes.map((c) => {
      const pedido = pedidoMap[c.codCli] ?? null;
      return {
        ...c,
        liberacao: pedido
          ? {
              status: "PEDIDO",
              numped: pedido.ultimoNumped,
              numPedidos: pedido.numPedidos,
              valorAtingido: pedido.valorTotal,
              recompensa: `${pedido.numPedidos} pedido(s) · 30 dias`,
            }
          : null,
      };
    });

    return NextResponse.json({ clientes: enriched, total: enriched.length });
  } catch (error: any) {
    console.error("Sellout load error:", error);
    return NextResponse.json({ error: "Falha ao carregar sell-out" }, { status: 500 });
  }
}
