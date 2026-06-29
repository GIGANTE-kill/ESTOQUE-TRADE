import { oracleQuery } from "@/lib/oracle";
import { getCache, setCache } from "@/lib/pg-cache";

// TTLs do cache PostgreSQL (persiste entre reinicializações do servidor)
const CACHE_TTL_FORNEC_MS  = 10 * 60 * 1000; // 10 minutos — fornecedores principais
const CACHE_TTL_SELLOUT_MS = 10 * 60 * 1000; // 10 minutos — sell-out por cliente
const CACHE_TTL_PEDIDOS_MS =  5 * 60 * 1000; //  5 minutos — pedidos 30 dias (mudam mais)


// ─────────────────────────────────────────────────────────────
// Sell-out a partir do Oracle (PM_FATURAMENTO).
// Métrica = SUM(FATURAMENTO_3M). Fornecedor agregado por
// "fornecedor principal" curado (PM_FORNECEDOR, cod_fornec não-numérico).
// Chave da meta (Meta B) = (fornecedor principal × cliente).
//
// Casamento faturamento↔fornecedor (robusto a acento/pontuação e às
// duas formas de cadastro no Winthor):
//   A) por nome — NORM(nome_fornecedor) contém NORM(f.nome); OU
//   B) pelo mapa de marcas PM_FAT_FORNEC_MAP (brand_key normalizado).
// Isso cobre marcas sem mapa (ex.: L'Oréal) e consolida múltiplos
// códigos do mesmo fornecedor (ex.: as 4 filiais Unilever).
// ─────────────────────────────────────────────────────────────

// Normaliza no Oracle: remove acentos (TRANSLATE) e não-alfanuméricos.
const NORM = (c: string) =>
  `REGEXP_REPLACE(TRANSLATE(UPPER(${c}),'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ','AAAAAEEEEIIIIOOOOOUUUUCN'),'[^A-Z0-9]','')`;

// FROM/JOIN/WHERE compartilhado pelas consultas de sell-out.
const SELLOUT_FROM = `
  FROM pm_fornecedor f
  JOIN pm_faturamento ft
    ON ( ${NORM("ft.nome_fornecedor")} LIKE '%' || ${NORM("f.nome")} || '%'
      OR ft.cod_fornec IN (
           SELECT TO_CHAR(m.codfornec) FROM pm_fat_fornec_map m
            WHERE ${NORM("m.brand_key")} = ${NORM("f.cod_fornec")} ) )
 WHERE NOT REGEXP_LIKE(f.cod_fornec, '^[0-9]+$')`;

export interface FornecedorPrincipal {
  id: number;
  nome: string;
  clientes: number;
  selloutTotal: number;
}

export interface SelloutCliente {
  fornecedorId: number;
  fornecedor: string;
  codCli: string;
  cliente: string;
  cnpj: string | null;
  sellout: number;
}

/**
 * Lista os fornecedores principais que de fato "puxam" faturamento
 * (têm mapeamento em PM_FAT_FORNEC_MAP). Alimenta a busca no cadastro
 * de metas. `search` filtra por nome (case-insensitive).
 */
export async function listFornecedoresPrincipais(
  search?: string
): Promise<FornecedorPrincipal[]> {
  const cacheKey = `fornec:${search ?? ""}`;
  const cached = await getCache<FornecedorPrincipal[]>(cacheKey);
  if (cached) return cached;

  const rows = await oracleQuery<{
    ID: number;
    NOME: string;
    CLIENTES: number;
    SELLOUT_TOTAL: number;
  }>(
    `SELECT f.id AS ID,
            f.nome AS NOME,
            COUNT(DISTINCT ft.cod_cli) AS CLIENTES,
            SUM(ft.faturamento_1m) AS SELLOUT_TOTAL
       ${SELLOUT_FROM}
         AND (:search IS NULL OR UPPER(f.nome) LIKE '%' || UPPER(:search) || '%')
      GROUP BY f.id, f.nome
      ORDER BY SELLOUT_TOTAL DESC`,
    { search: search && search.trim() ? search.trim() : null }
  );

  const result = rows.map((r) => ({
    id: Number(r.ID),
    nome: r.NOME,
    clientes: Number(r.CLIENTES),
    selloutTotal: Number(r.SELLOUT_TOTAL ?? 0),
  }));
  await setCache(cacheKey, result, CACHE_TTL_FORNEC_MS);
  return result;
}

/**
 * Sell-out por cliente para um fornecedor principal específico,
 * ordenado do maior para o menor. Base do painel de progresso/metas.
 */
export async function selloutPorCliente(
  fornecedorId: number
): Promise<SelloutCliente[]> {
  const cacheKey = `sellout:${fornecedorId}`;
  const cached = await getCache<SelloutCliente[]>(cacheKey);
  if (cached) return cached;

  const rows = await oracleQuery<{
    FORNECEDOR_ID: number;
    FORNECEDOR: string;
    COD_CLI: string;
    CLIENTE: string;
    CNPJ: string | null;
    SELLOUT: number;
  }>(
    `SELECT f.id AS FORNECEDOR_ID,
            f.nome AS FORNECEDOR,
            ft.cod_cli AS COD_CLI,
            MAX(NVL(ft.nome_fantasia, ft.nome_cliente)) AS CLIENTE,
            MAX(ft.cnpj_cpf) AS CNPJ,
            SUM(ft.faturamento_1m) AS SELLOUT
       ${SELLOUT_FROM}
         AND f.id = :fornecedorId
      GROUP BY f.id, f.nome, ft.cod_cli
      ORDER BY SELLOUT DESC`,
    { fornecedorId }
  );

  const result = rows.map((r) => ({
    fornecedorId: Number(r.FORNECEDOR_ID),
    fornecedor: r.FORNECEDOR,
    codCli: String(r.COD_CLI),
    cliente: r.CLIENTE,
    cnpj: r.CNPJ ?? null,
    sellout: Number(r.SELLOUT ?? 0),
  }));
  await setCache(cacheKey, result, CACHE_TTL_SELLOUT_MS);
  return result;
}


// ─────────────────────────────────────────────────────────────
// Pedidos com produtos do fornecedor por cliente (Winthor)
//
// Abordagem: ao invés de filtrar por posição do pedido (L/M — que
// pode não existir), somamos o valor dos PRODUTOS do fornecedor
// (identificados via pm_fat_fornec_map → pcprodut.codfornec) em
// TODOS os pedidos de cada cliente nos últimos 90 dias.
//
// Isso responde: "quanto cada cliente comprou de produtos deste
// fornecedor recentemente?" — independente do status do pedido.
// ─────────────────────────────────────────────────────────────

export interface PedidoResumo {
  numPedidos: number;    // quantidade de pedidos distintos com produtos do fornecedor
  valorTotal: number;    // soma qt×pvenda dos itens do fornecedor
  ultimoNumped: number;  // número do pedido mais recente
}

/**
 * Para cada cliente da lista, soma o valor dos produtos do fornecedor
 * (via pm_fat_fornec_map → pcprodut) nos pedidos Winthor dos últimos 90 dias.
 *
 * @param fornecedorId  ID do PM_FORNECEDOR (Oracle) — necessário para filtrar produtos
 * @param codClis       Lista de cod_cli do pm_faturamento (serão convertidos para NUMBER)
 */
export async function pedidosPorFornecedorEClientes(
  fornecedorId: number,
  codClis: string[]
): Promise<Record<string, PedidoResumo>> {
  if (codClis.length === 0) return {};

  const sorted = [...codClis].sort();
  const cacheKey = `pedidosfornec:${fornecedorId}:${sorted.join(",")}`;
  const cached = await getCache<Record<string, PedidoResumo>>(cacheKey);
  if (cached) return cached;

  // pcpedc.codcli é NUMBER — converte para evitar mismatch de tipo no Oracle
  const codcliNums = sorted
    .map((c) => Number(c))
    .filter((n) => !isNaN(n) && n > 0);

  if (codcliNums.length === 0) return {};

  const binds: Record<string, number> = { fornecedorId };
  const inClause = codcliNums
    .map((c, i) => { binds[`c${i}`] = c; return `:c${i}`; })
    .join(",");

  // Subquery: códigos Winthor do fornecedor via pm_fat_fornec_map
  // pm_fat_fornec_map.codfornec = código numérico do fornecedor em pcprodut
  const rows = await oracleQuery<{
    COD_CLI: number;
    NUM_PEDIDOS: number;
    VALOR_TOTAL: number;
    ULTIMO_NUMPED: number;
  }>(
    `SELECT p.codcli              AS COD_CLI,
            COUNT(DISTINCT p.numped) AS NUM_PEDIDOS,
            SUM(NVL(d.qt, 0) * NVL(d.pvenda, 0)) AS VALOR_TOTAL,
            MAX(p.numped)         AS ULTIMO_NUMPED
       FROM pcdedic  d
       JOIN pcpedc   p  ON p.numped  = d.numped
       JOIN pcprodut pr ON pr.codprod = d.codprod
      WHERE p.codcli IN (${inClause})
        AND pr.codfornec IN (
              SELECT m.codfornec
                FROM pm_fat_fornec_map m
                JOIN pm_fornecedor f
                  ON ${NORM("m.brand_key")} = ${NORM("f.cod_fornec")}
               WHERE f.id = :fornecedorId
            )
        AND p.dtped >= SYSDATE - 30
      GROUP BY p.codcli
      ORDER BY VALOR_TOTAL DESC`,
    binds
  );

  const result: Record<string, PedidoResumo> = {};
  for (const r of rows) {
    result[String(r.COD_CLI)] = {
      numPedidos: Number(r.NUM_PEDIDOS),
      valorTotal: Number(r.VALOR_TOTAL ?? 0),
      ultimoNumped: Number(r.ULTIMO_NUMPED),
    };
  }

  await setCache(cacheKey, result, CACHE_TTL_PEDIDOS_MS);
  return result;
}
