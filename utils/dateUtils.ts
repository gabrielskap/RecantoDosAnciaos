/**
 * Retorna a data atual no formato YYYY-MM-DD em horário local.
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna o início da data atual no formato YYYY-MM-DDTHH:mm em horário local (com HH:mm zerado 00:00).
 */
export function getTodayStartDatetimeLocal(): string {
  return `${getTodayDateString()}T00:00`;
}

/**
 * Retorna o momento atual no formato YYYY-MM-DDTHH:mm em horário local.
 */
export function getNowDatetimeLocal(): string {
  return new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
}

/**
 * Soma anos a uma data no formato YYYY-MM-DD e retorna o resultado no mesmo formato.
 */
export function addYearsToDateString(dateStr: string, years: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setFullYear(d.getFullYear() + years);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Verifica se uma string de data/datetime representa uma data anterior ao início do dia atual (00:00:00).
 */
export function isBeforeToday(dateStr: string): boolean {
  if (!dateStr) return false;

  // Trata 'YYYY-MM-DD' garantindo interpretação em horário local para não haver desvio de fuso
  let target: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    target = new Date(year, month - 1, day);
  } else {
    target = new Date(dateStr);
  }

  if (isNaN(target.getTime())) return true;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return target.getTime() < todayStart.getTime();
}
