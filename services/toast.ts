export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners: Set<Listener> = new Set();

function notify() {
  listeners.forEach(fn => fn([...toasts]));
}

export const toast = {
  show(message: string, type: ToastType = 'info', durationMs = 4000) {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, message, type }];
    notify();
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notify();
    }, durationMs);
  },
  success(message: string) { this.show(message, 'success'); },
  error(message: string)   { this.show(message, 'error', 6000); },
  warning(message: string) { this.show(message, 'warning'); },
  info(message: string)    { this.show(message, 'info'); },
  subscribe(fn: Listener)  { listeners.add(fn); return () => listeners.delete(fn); },
};
