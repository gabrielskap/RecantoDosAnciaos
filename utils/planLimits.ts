export const excedeLimite = (qtd: number, max: number | null | undefined): boolean =>
  max != null && qtd > max;

export const formatLimite = (max: number | null | undefined): string =>
  max == null ? 'Ilimitado' : String(max);
