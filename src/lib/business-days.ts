// ─────────────────────────────────────────────────────────────
// Dias úteis (exclui sábados e domingos; opcionalmente feriados).
// Feriados podem ser injetados como array de "YYYY-MM-DD".
// ─────────────────────────────────────────────────────────────

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Conta dias úteis no intervalo [start, end].
 * - Inclui o dia inicial e o final se forem úteis.
 * - Se end < start, retorna 0.
 */
export function countBusinessDays(
  start: Date,
  end: Date,
  holidays: string[] = []
): number {
  if (end < start) return 0;
  const holidaySet = new Set(holidays);
  let count = 0;
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cur <= last) {
    if (!isWeekend(cur) && !holidaySet.has(ymd(cur))) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}
