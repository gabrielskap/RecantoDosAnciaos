import type { LucideIcon } from 'lucide-react';
import type { AccentKey } from './accents';

export interface Pain { icon: LucideIcon; text: string; }
export interface Highlight { icon: LucideIcon; title: string; text: string; }
export interface Benefit { icon: LucideIcon; title: string; text: string; }
export interface ComparisonRow { manual: string; sistema: string; }
export interface SavingStat { value: string; label: string; }
export interface FeatureTestimonialData {
  text: string;
  name: string;
  role: string;
  institution: string;
  avatar: string;
  /** Classe Tailwind literal de cor de fundo do avatar (ex.: 'bg-pink-500'). */
  color: string;
}

/** Conteúdo completo de uma página de módulo (data-driven). */
export interface FeatureContent {
  slug: string;
  icon: LucideIcon;
  accent: AccentKey;
  eyebrow: string;
  title: string;
  subtitle: string;
  heroBullets: string[];
  problem: { title: string; intro?: string; pains: Pain[] };
  solution: { title: string; description: string; highlights: Highlight[] };
  benefits: Benefit[];
  comparison: ComparisonRow[];
  /** Métricas de economia. Opcional — só exibir com números reais/defensáveis. */
  savings?: SavingStat[];
  /** Depoimento. Opcional — só exibir com depoimento real e consentido. */
  testimonial?: FeatureTestimonialData;
}
