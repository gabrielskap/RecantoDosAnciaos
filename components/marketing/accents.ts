// Mapa estático de cores de destaque por módulo.
// IMPORTANTE: as classes precisam ser strings literais completas para que o
// Tailwind v4 as detecte (não construir `bg-${cor}-50` dinamicamente).

export type AccentKey =
  | 'blue' | 'rose' | 'emerald' | 'amber' | 'violet' | 'cyan' | 'orange' | 'indigo' | 'purple';

export interface Accent {
  /** Chip de ícone: fundo claro + cor do ícone. */
  chip: string;
  /** Fundo suave (ex.: seções, badges). */
  soft: string;
  /** Cor de texto/realce. */
  text: string;
  /** Ponto/check colorido. */
  dot: string;
  /** Borda suave. */
  border: string;
}

export const ACCENTS: Record<AccentKey, Accent> = {
  blue:    { chip: 'bg-blue-50 text-blue-600',       soft: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-500',    border: 'border-blue-100' },
  rose:    { chip: 'bg-rose-50 text-rose-600',       soft: 'bg-rose-50',    text: 'text-rose-600',    dot: 'bg-rose-500',    border: 'border-rose-100' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600', soft: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', border: 'border-emerald-100' },
  amber:   { chip: 'bg-amber-50 text-amber-600',     soft: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-500',   border: 'border-amber-100' },
  violet:  { chip: 'bg-violet-50 text-violet-600',   soft: 'bg-violet-50',  text: 'text-violet-600',  dot: 'bg-violet-500',  border: 'border-violet-100' },
  cyan:    { chip: 'bg-cyan-50 text-cyan-600',       soft: 'bg-cyan-50',    text: 'text-cyan-600',    dot: 'bg-cyan-500',    border: 'border-cyan-100' },
  orange:  { chip: 'bg-orange-50 text-orange-600',   soft: 'bg-orange-50',  text: 'text-orange-600',  dot: 'bg-orange-500',  border: 'border-orange-100' },
  indigo:  { chip: 'bg-indigo-50 text-indigo-600',   soft: 'bg-indigo-50',  text: 'text-indigo-600',  dot: 'bg-indigo-500',  border: 'border-indigo-100' },
  purple:  { chip: 'bg-purple-50 text-purple-600',   soft: 'bg-purple-50',  text: 'text-purple-600',  dot: 'bg-purple-500',  border: 'border-purple-100' },
};

export const getAccent = (key: AccentKey): Accent => ACCENTS[key] ?? ACCENTS.blue;
