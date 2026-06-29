import { countBusinessDays } from "@/lib/business-days";

// ─────────────────────────────────────────────────────────────
// Projeção de esgotamento de estoque por material em ação.
// Cruza estoque atual × dias úteis × ritmo real (saídas) e
// compara com o ritmo ideal para durar até o fim da ação.
// ─────────────────────────────────────────────────────────────

export type ProjecaoStatus = "PARADO" | "RISCO" | "SOBRANDO" | "OK";

// Dias úteis sem saída para considerar "produto parado"
const LIMITE_PARADO = 5;

export interface ProjecaoInput {
  quantity: number;
  periodoAcaoInicio: Date | null;
  periodoAcaoFim: Date | null;
  entryDate: Date;
  saidas: { quantity: number; createdAt: Date }[];
  hoje?: Date;
  holidays?: string[];
}

export interface Projecao {
  diasUteisDecorridos: number;
  diasUteisRestantes: number;
  totalSaidas: number;
  ritmoReal: number; // un/dia útil (histórico)
  ritmoIdeal: number | null; // un/dia útil p/ durar até o fim
  projecaoDiasUteis: number | null; // dias úteis até zerar no ritmo real
  estoqueProjetadoFim: number | null; // saldo previsto no fim da ação
  diasSemSaida: number | null;
  status: ProjecaoStatus;
  resumo: string;
}

export function calcularProjecao(input: ProjecaoInput): Projecao {
  const hoje = input.hoje ?? new Date();
  const holidays = input.holidays ?? [];
  const inicio = input.periodoAcaoInicio ?? input.entryDate;
  const fim = input.periodoAcaoFim;

  const fimPeriodoDecorrido = fim && fim < hoje ? fim : hoje;
  const diasUteisDecorridos = Math.max(1, countBusinessDays(inicio, fimPeriodoDecorrido, holidays));
  const diasUteisRestantes = fim ? countBusinessDays(hoje, fim, holidays) : 0;

  // Saídas dentro do período da ação
  const saidasPeriodo = input.saidas.filter((s) => s.createdAt >= inicio);
  const totalSaidas = saidasPeriodo.reduce((acc, s) => acc + s.quantity, 0);

  const ritmoReal = totalSaidas / diasUteisDecorridos;
  const ritmoIdeal = diasUteisRestantes > 0 ? input.quantity / diasUteisRestantes : null;

  const projecaoDiasUteis = ritmoReal > 0 ? input.quantity / ritmoReal : null;
  const estoqueProjetadoFim =
    diasUteisRestantes > 0 ? input.quantity - ritmoReal * diasUteisRestantes : input.quantity;

  // Última saída → dias úteis sem vender
  const ultimaSaida = saidasPeriodo.reduce<Date | null>(
    (max, s) => (max === null || s.createdAt > max ? s.createdAt : max),
    null
  );
  const diasSemSaida = ultimaSaida ? countBusinessDays(ultimaSaida, hoje, holidays) : null;

  // Classificação
  let status: ProjecaoStatus;
  let resumo: string;

  if (input.quantity <= 0) {
    status = "RISCO";
    resumo = "Estoque zerado.";
  } else if (totalSaidas === 0 || (diasSemSaida !== null && diasSemSaida >= LIMITE_PARADO)) {
    status = "PARADO";
    resumo =
      totalSaidas === 0
        ? "Sem nenhuma saída na ação."
        : `Parado há ${diasSemSaida} dias úteis sem saída.`;
  } else if (projecaoDiasUteis !== null && diasUteisRestantes > 0 && projecaoDiasUteis < diasUteisRestantes) {
    const faltam = diasUteisRestantes - Math.floor(projecaoDiasUteis);
    status = "RISCO";
    resumo = `No ritmo atual, acaba ~${faltam} dia(s) úteis antes do fim da ação.`;
  } else if (estoqueProjetadoFim !== null && estoqueProjetadoFim > input.quantity * 0.25 && diasUteisRestantes > 0) {
    status = "SOBRANDO";
    resumo = `Deve sobrar ~${Math.round(estoqueProjetadoFim)} un no fim da ação.`;
  } else {
    status = "OK";
    resumo = "Ritmo dentro do esperado para a ação.";
  }

  return {
    diasUteisDecorridos,
    diasUteisRestantes,
    totalSaidas,
    ritmoReal: Number(ritmoReal.toFixed(2)),
    ritmoIdeal: ritmoIdeal !== null ? Number(ritmoIdeal.toFixed(2)) : null,
    projecaoDiasUteis: projecaoDiasUteis !== null ? Math.round(projecaoDiasUteis) : null,
    estoqueProjetadoFim: estoqueProjetadoFim !== null ? Math.round(estoqueProjetadoFim) : null,
    diasSemSaida,
    status,
    resumo,
  };
}

// Normaliza nome de fornecedor para casar Material.fornecedor (texto livre)
// com o fornecedor principal do Oracle (ex.: "LOREAL" ↔ "L'Oréal").
export function normalizeFornecedor(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9]/g, "") // remove apóstrofos, espaços, pontuação
    .toUpperCase();
}
