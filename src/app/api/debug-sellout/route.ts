export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { oracleQuery } from "@/lib/oracle";
import { invalidateCacheByPrefix } from "@/lib/pg-cache";

/**
 * Rota de debug para investigar o sell-out e clientes de um fornecedor.
 *
 * Uso:
 *   GET /api/debug-sellout?fornecedor=LOREAL          → busca fornecedores que casam com o nome
 *   GET /api/debug-sellout?fornecedorId=42&top=5     → top N clientes do fornecedor
 *   GET /api/debug-sellout?flush=1                    → limpa todo o cache Oracle do PostgreSQL
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fornecedor = searchParams.get("fornecedor");
  const fornecedorId = searchParams.get("fornecedorId");
  const top = Number(searchParams.get("top") ?? 10);
  const flush = searchParams.get("flush");

  // ── Flush do cache ──────────────────────────────────────────────────────────
  if (flush) {
    const [f1, f2, f3] = await Promise.all([
      invalidateCacheByPrefix("pedidos:"),
      invalidateCacheByPrefix("sellout:"),
      invalidateCacheByPrefix("fornec:"),
    ]);
    return NextResponse.json({
      ok: true,
      message: `Cache limpo: ${f1} entradas de pedidos, ${f2} de sellout, ${f3} de fornecedores. Recarregue a página.`,
    });
  }

  // ── Busca fornecedores pelo nome ─────────────────────────────────────────────
  if (fornecedor) {
    const rows = await oracleQuery<{
      ID: number; NOME: string; COD_FORNEC: string;
    }>(
      `SELECT id AS ID, nome AS NOME, cod_fornec AS COD_FORNEC
         FROM pm_fornecedor
        WHERE UPPER(nome) LIKE '%' || UPPER(:nome) || '%'
          AND NOT REGEXP_LIKE(cod_fornec, '^[0-9]+$')
        ORDER BY nome`,
      { nome: fornecedor }
    ).catch(() => []);

    return NextResponse.json({
      busca: fornecedor,
      fornecedores_encontrados: rows.map((r) => ({
        id: Number(r.ID),
        nome: r.NOME,
        cod_fornec: r.COD_FORNEC,
        url_clientes: `/api/debug-sellout?fornecedorId=${r.ID}`,
        url_debug_cliente: `/api/debug-pedidos?codcli=SUBSTITUA_PELO_CODCLI`,
      })),
    });
  }

  // ── Top clientes de um fornecedor ────────────────────────────────────────────
  if (fornecedorId) {
    const NORM = (c: string) =>
      `REGEXP_REPLACE(TRANSLATE(UPPER(${c}),'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ','AAAAAEEEEIIIIOOOOOUUUUCN'),'[^A-Z0-9]','')`;

    const clientes = await oracleQuery<{
      COD_CLI: string | number;
      CLIENTE: string;
      SELLOUT: number;
    }>(
      `SELECT ft.cod_cli AS COD_CLI,
              MAX(NVL(ft.nome_fantasia, ft.nome_cliente)) AS CLIENTE,
              SUM(ft.faturamento_3m) AS SELLOUT
         FROM pm_fornecedor f
         JOIN pm_faturamento ft
           ON ( ${NORM("ft.nome_fornecedor")} LIKE '%' || ${NORM("f.nome")} || '%'
             OR ft.cod_fornec IN (
                  SELECT TO_CHAR(m.codfornec) FROM pm_fat_fornec_map m
                   WHERE ${NORM("m.brand_key")} = ${NORM("f.cod_fornec")} ) )
        WHERE NOT REGEXP_LIKE(f.cod_fornec, '^[0-9]+$')
          AND f.id = :fornecedorId
        GROUP BY ft.cod_cli
        ORDER BY SELLOUT DESC
        FETCH FIRST :top ROWS ONLY`,
      { fornecedorId: Number(fornecedorId), top }
    ).catch((e) => { throw e; });

    // Para cada cliente, verifica pedidos L/M
    const codclis = clientes.map((c) => Number(c.COD_CLI));
    let pedidoInfo: Record<number, { numped: number; posicao: string; valor: number }> = {};

    if (codclis.length > 0) {
      const binds: Record<string, number> = {};
      const inClause = codclis.map((c, i) => { binds[`c${i}`] = c; return `:c${i}`; }).join(",");
      const pedRows = await oracleQuery<{
        COD_CLI: number; NUMPED: number; POSICAO: string; VALOR: number;
      }>(
        `SELECT p.codcli AS COD_CLI, p.numped AS NUMPED, p.posicao AS POSICAO,
                SUM(NVL(d.qt,0)*NVL(d.pvenda,0)) AS VALOR
           FROM pcdedic d JOIN pcpedc p ON p.numped = d.numped
          WHERE p.posicao IN ('L','M')
            AND p.codcli IN (${inClause})
          GROUP BY p.codcli, p.numped, p.posicao
          ORDER BY p.codcli, p.numped DESC`,
        binds
      ).catch(() => []);

      for (const r of pedRows) {
        const k = Number(r.COD_CLI);
        if (!pedidoInfo[k]) {
          pedidoInfo[k] = { numped: Number(r.NUMPED), posicao: r.POSICAO, valor: Number(r.VALOR ?? 0) };
        }
      }
    }

    return NextResponse.json({
      fornecedorId,
      top,
      clientes: clientes.map((c) => {
        const codCliNum = Number(c.COD_CLI);
        const pedido = pedidoInfo[codCliNum] ?? null;
        return {
          codCli: String(c.COD_CLI),
          codCliTipo: typeof c.COD_CLI,
          cliente: c.CLIENTE,
          sellout: Number(c.SELLOUT ?? 0),
          pedido,
          url_debug_pedido: `/api/debug-pedidos?codcli=${c.COD_CLI}`,
        };
      }),
    });
  }

  return NextResponse.json({
    uso: {
      buscar_fornecedor: "/api/debug-sellout?fornecedor=loreal",
      top_clientes: "/api/debug-sellout?fornecedorId=42&top=5",
      flush_cache: "/api/debug-sellout?flush=1",
      debug_cliente: "/api/debug-pedidos?codcli=1234",
    },
  });
}
