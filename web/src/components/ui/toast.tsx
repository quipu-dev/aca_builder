import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toastsState: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  for (const listener of listeners) {
    listener([...toastsState]);
  }
}

export const toast = {
  success: (message: string, duration = 2500) => {
    toast.add({ type: 'success', message, duration });
  },
  error: (message: string, duration = 4000) => {
    toast.add({ type: 'error', message, duration });
  },
  info: (message: string, duration = 3000) => {
    toast.add({ type: 'info', message, duration });
  },
  add: (item: Omit<ToastItem, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    toastsState = [...toastsState, { ...item, id }];
    notify();

    if (item.duration && item.duration > 0) {
      setTimeout(() => {
        toast.remove(id);
      }, item.duration);
    }
  },
  remove: (id: string) => {
    toastsState = toastsState.filter((t) => t.id !== id);
    notify();
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-9 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none font-sans text-xs">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
            t.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800/80 text-emerald-200'
              : t.type === 'error'
                ? 'bg-rose-950/90 border-rose-800/80 text-rose-200'
                : 'bg-slate-900/90 border-slate-800 text-slate-200'
          }`}
        >
          {t.type === 'success' && (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          {t.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />}

          <div className="flex-1 break-words leading-relaxed select-text">{t.message}</div>

          <button
            type="button"
            onClick={() => toast.remove(t.id)}
            className="p-0.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
