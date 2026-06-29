import { prisma } from "@/lib/prisma";
import { selloutPorCliente } from "@/lib/sellout";

// ─────────────────────────────────────────────────────────────
// Motor de liberações: cruza o sell-out (Oracle) com as metas
// ativas (Postgres) e cria uma Liberacao para cada (meta × cliente)
// que atingiu o valor mínimo. Idempotente — a unicidade
// (metaId, codCli) evita duplicar liberações já existentes.
// ─────────────────────────────────────────────────────────────

export interface ProcessamentoResultado {
  metasAvaliadas: number;
  novasLiberacoes: number;
  liberacoes: { fornecedor: string; cliente: string; recompensa: string; valor: number }[];
}

export async function processarLiberacoes(): Promise<ProcessamentoResultado> {
  const metas = await prisma.metaFornecedor.findMany({ where: { ativo: true } });

  // Cache de sell-out por fornecedor (várias faixas compartilham o mesmo fornecedor)
  const selloutCache = new Map<number, Awaited<ReturnType<typeof selloutPorCliente>>>();

  const novas: ProcessamentoResultado["liberacoes"] = [];

  for (const meta of metas) {
    let sellout = selloutCache.get(meta.fornecedorId);
    if (!sellout) {
      sellout = await selloutPorCliente(meta.fornecedorId);
      selloutCache.set(meta.fornecedorId, sellout);
    }

    const atingiram = sellout.filter((c) => c.sellout >= meta.valorMinimo);

    for (const cli of atingiram) {
      const existente = await prisma.liberacao.findUnique({
        where: { metaId_codCli: { metaId: meta.id, codCli: cli.codCli } },
      });
      if (existente) continue;

      await prisma.liberacao.create({
        data: {
          metaId: meta.id,
          fornecedorId: meta.fornecedorId,
          fornecedorNome: meta.fornecedorNome,
          codCli: cli.codCli,
          nomeCliente: cli.cliente,
          cnpj: cli.cnpj,
          valorAtingido: cli.sellout,
          status: "LIBERADO",
        },
      });

      novas.push({
        fornecedor: meta.fornecedorNome,
        cliente: cli.cliente,
        recompensa: meta.recompensa,
        valor: cli.sellout,
      });
    }
  }

  return {
    metasAvaliadas: metas.length,
    novasLiberacoes: novas.length,
    liberacoes: novas,
  };
}
