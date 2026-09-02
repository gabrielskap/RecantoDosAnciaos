export type SystemDialogTone = 'info' | 'warning' | 'danger' | 'error';

export interface SystemDialogOptions {
  title?: string;
  message: string;
  tone?: SystemDialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface SystemDialogRequest extends Required<Omit<SystemDialogOptions, 'tone'>> {
  id: string;
  tone: SystemDialogTone;
  kind: 'alert' | 'confirm';
}

type Listener = (request: SystemDialogRequest | null) => void;

interface QueueItem {
  request: SystemDialogRequest;
  resolve: (confirmed: boolean) => void;
}

let current: QueueItem | null = null;
const queue: QueueItem[] = [];
const listeners = new Set<Listener>();

const notify = () => listeners.forEach(listener => listener(current?.request ?? null));

const showNext = () => {
  if (current || queue.length === 0) return;
  current = queue.shift() ?? null;
  notify();
};

const enqueue = (kind: 'alert' | 'confirm', options: SystemDialogOptions) =>
  new Promise<boolean>(resolve => {
    const tone = options.tone ?? (kind === 'confirm' ? 'danger' : 'info');
    queue.push({
      request: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind,
        tone,
        title: options.title ?? (kind === 'confirm' ? 'Confirmar ação' : tone === 'error' ? 'Não foi possível concluir' : 'Atenção'),
        message: options.message,
        confirmLabel: options.confirmLabel ?? (kind === 'confirm' ? 'Confirmar' : 'Entendi'),
        cancelLabel: options.cancelLabel ?? 'Cancelar',
      },
      resolve,
    });
    showNext();
  });

export const systemDialog = {
  confirm(options: SystemDialogOptions | string) {
    return enqueue('confirm', typeof options === 'string' ? { message: options } : options);
  },

  async alert(options: SystemDialogOptions | string) {
    await enqueue('alert', typeof options === 'string' ? { message: options } : options);
  },

  resolve(confirmed: boolean) {
    if (!current) return;
    const finished = current;
    current = null;
    finished.resolve(confirmed);
    notify();
    showNext();
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(current?.request ?? null);
    return () => listeners.delete(listener);
  },
};
