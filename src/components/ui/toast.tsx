import { useEffect } from 'react';
import { create } from 'zustand';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: 'default' | 'destructive';
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let toastSeq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) =>
    set((s) => ({ toasts: [...s.toasts, { ...t, id: ++toastSeq }] })),
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** 轻通知：任意位置调用 toast('文案') 即可 */
export function toast(
  title: string,
  opts?: { description?: string; variant?: 'default' | 'destructive' },
) {
  useToastStore.getState().push({
    title,
    description: opts?.description,
    variant: opts?.variant ?? 'default',
  });
}

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, dismiss]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-2 rounded-lg border p-3 shadow-lg animate-in slide-in-from-right-5',
        item.variant === 'destructive'
          ? 'border-destructive/50 bg-destructive text-destructive-foreground'
          : 'border-border bg-card text-card-foreground',
      )}
    >
      <div className="flex-1 text-sm">
        <div className="font-medium">{item.title}</div>
        {item.description && (
          <div className="mt-1 text-xs opacity-80">{item.description}</div>
        )}
      </div>
      <button
        onClick={() => dismiss(item.id)}
        className="opacity-60 hover:opacity-100 cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** 挂载在应用根部，渲染所有通知 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}
