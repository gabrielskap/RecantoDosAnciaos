import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, Info, X, XCircle } from 'lucide-react';
import { systemDialog, SystemDialogRequest } from '../services/systemDialog';

const toneStyles = {
  info: {
    icon: Info,
    iconWrap: 'bg-blue-50 text-blue-600 ring-blue-100',
    button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-200',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-50 text-amber-600 ring-amber-100',
    button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-200',
  },
  danger: {
    icon: HelpCircle,
    iconWrap: 'bg-rose-50 text-rose-600 ring-rose-100',
    button: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-200',
  },
  error: {
    icon: XCircle,
    iconWrap: 'bg-rose-50 text-rose-600 ring-rose-100',
    button: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-200',
  },
};

const SystemDialog: React.FC = () => {
  const [dialog, setDialog] = useState<SystemDialogRequest | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => systemDialog.subscribe(setDialog), []);

  useEffect(() => {
    if (!dialog) return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => confirmButtonRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') systemDialog.resolve(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [dialog]);

  if (!dialog) return null;

  const styles = toneStyles[dialog.tone];
  const Icon = styles.icon;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) systemDialog.resolve(false);
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="system-dialog-title"
        aria-describedby="system-dialog-message"
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${styles.iconWrap}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="system-dialog-title" className="text-lg font-bold leading-6 text-slate-900">
              {dialog.title}
            </h2>
            <p id="system-dialog-message" className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
              {dialog.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => systemDialog.resolve(false)}
            className="-mr-2 -mt-2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {dialog.kind === 'confirm' && (
            <button
              type="button"
              onClick={() => systemDialog.resolve(false)}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {dialog.cancelLabel}
            </button>
          )}
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={() => systemDialog.resolve(true)}
            className={`min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4 ${styles.button}`}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

export default SystemDialog;
