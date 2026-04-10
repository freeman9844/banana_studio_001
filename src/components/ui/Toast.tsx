'use client';

import { useToast } from './ToastContext';

export function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-6 py-3 rounded-xl shadow-lg text-white font-bold flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-green-500'
              : toast.type === 'error'
              ? 'bg-red-500'
              : 'bg-blue-500'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-70 hover:opacity-100 ml-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
