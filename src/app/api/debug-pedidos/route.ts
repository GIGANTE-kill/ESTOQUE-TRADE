export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { oracleQuery } from "@/lib/oracle";

/**
 * Rota de debug para investigar pedidos de um cliente específico.
 * 
 * Uso:
 *   GET /api/debug-pedidos?codcli=1234
 *   GET /api/debug-pedidos?codcli=1234&posicoes=A,L,M,F
 * 
 * Retorna:
 *   - posicoes_disponiveis: todos os valores de posicao na pcpedc para esse cliente
 *   - pedidos_L_M: pedidos com posição L ou M (que o sistema usa)
 *   - sample_pcpedc: amostra dos últimos 10 pedidos independente de posição
 *   - tipo_codcli: tipo do campo codcli na pcpedc (para detectar mismatch numérico/string)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codcliParam = searchParams.get("codcli");
  const posicoesParam = searchParams.get("posicoes") ?? "L,M";

  if (!codcliParam) {
    return NextResponse.json({
      error: "Parâmetro obrigatório: ?codcli=NUMERO_DO_CLIENTE",
      exemplo: "/api/debug-pedidos?codcli=1234",
    }, { status: 400 });
  }

  const codcliNum = Number(codcliParam);
  const posicoes = posicoesParam.split(",").map((p) => p.trim().toUpperCase());

  try {
    // ── 1. Verificar posições disponíveis para o cliente ──────────────────────
    const posDisp = await oracleQuery<{ POSICAO: string; QTD: number }>(
      `SELECT posicao AS POSICAO, COUNT(*) AS QTD
         FROM pcpedc
        WHERE codcli = :codcli
        GROUP BY posicao
        ORDER BY QTD DESC`,
      { codcli: codcliNum }
    );

    // ── 2. Pedidos L/M (exatamente o que o sistema busca) ────────────────────
    const pedidosLM = await oracleQuery<{
      NUMPED: number;
      POSICAO: string;
      DTPED: string;
      VALOR: number;
    }>(
      `SELECT p.numped AS NUMPED,
              p.posicao AS POSICAO,
              TO_CHAR(p.dtped, 'YYYY-MM-DD') AS DTPED,
              SUM(NVL(d.qt, 0) * NVL(d.pvenda, 0)) AS VALOR
         FROM pcpedc p
         JOIN pcdedic d ON d.numped = p.numped
        WHERE p.codcli = :codcli
          AND p.posicao IN ('L', 'M')
        GROUP BY p.numped, p.posicao, p.dtped
        ORDER BY p.numped DESC
        FETCH FIRST 20 ROWS ONLY`,
      { codcli: codcliNum }
    );

    // ── 3. Últimos 10 pedidos independente de posição ─────────────────────────
    const ultimosPedidos = await oracleQuery<{
      NUMPED: number;
      POSICAO: string;
      DTPED: string;
    }>(
      `SELECT numped AS NUMPED, posicao AS POSICAO,
              TO_CHAR(dtped, 'YYYY-MM-DD') AS DTPED
         FROM pcpedc
        WHERE codcli = :codcli
        ORDER BY numped DESC
        FETCH FIRST 10 ROWS ONLY`,
      { codcli: codcliNum }
    );

    // ── 4. Testar com bind string (como o sellout passa) ─────────────────────
    const codcliStr = String(codcliParam);
    let pedidosViaString: { QTD: number }[] = [];
    try {
      pedidosViaString = await oracleQuery<{ QTD: number }>(
        `SELECT COUNT(*) AS QTD FROM pcpedc WHERE codcli = :codcli AND posicao IN ('L','M')`,
        { codcli: codcliStr }
      );
    } catch (e: any) {
      pedidosViaString = [{ QTD: -1 }]; // erro de tipo
    }

    // ── 5. Testar com bind numérico ────────────────────────────────────────────
    const pedidosViaNumero = await oracleQuery<{ QTD: number }>(
      `SELECT COUNT(*) AS QTD FROM pcpedc WHERE codcli = :codcli AND posicao IN ('L','M')`,
      { codcli: codcliNum }
    );

    return NextResponse.json({
      codcli: {
        parametro: codcliParam,
        como_numero: codcliNum,
        como_string: codcliStr,
      },
      diagnostico: {
        pedidos_LM_via_string: Number(pedidosViaString[0]?.QTD ?? 0),
        pedidos_LM_via_numero: Number(pedidosViaNumero[0]?.QTD ?? 0),
        mismatch_tipo: Number(pedidosViaString[0]?.QTD ?? 0) !== Number(pedidosViaNumero[0]?.QTD ?? 0),
      },
      posicoes_disponiveis: posDisp.map((r) => ({
        posicao: r.POSICAO,
        qtd_pedidos: Number(r.QTD),
      })),
      pedidos_L_M: pedidosLM.map((r) => ({
        numped: Number(r.NUMPED),
        posicao: r.POSICAO,
        data: r.DTPED,
        valor: Number(r.VALOR ?? 0),
      })),
      ultimos_10_pedidos: ultimosPedidos.map((r) => ({
        numped: Number(r.NUMPED),
        posicao: r.POSICAO,
        data: r.DTPED,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao consultar Oracle", detalhe: error.message },
      { status: 500 }
    );
  }
}
