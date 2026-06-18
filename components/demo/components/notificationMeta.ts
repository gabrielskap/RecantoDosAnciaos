import { Package, DollarSign, Pill, Cake, Bell, type LucideIcon } from 'lucide-react';
import type { NotificationType } from '../../../data/demoData';
import type { Tone } from './ui';

/** Ícone + tom por tipo de notificação (usado no topbar e na tela de notificações). */
export const NOTIF_META: Record<NotificationType, { icon: LucideIcon; tone: Tone }> = {
  estoque: { icon: Package, tone: 'amber' },
  financeiro: { icon: DollarSign, tone: 'rose' },
  medicacao: { icon: Pill, tone: 'blue' },
  aniversario: { icon: Cake, tone: 'violet' },
  sistema: { icon: Bell, tone: 'slate' },
};
