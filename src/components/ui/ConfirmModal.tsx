'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface ConfirmContextValue {
  confirm: (message: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    setState({ message, visible: true });
    return new Promise<boolean>((res) => {
      resolverRef.current = res;
    });
  }, []);

  const handleChoice = (value: boolean) => {
    setState((s) => ({ ...s, visible: false }));
    resolverRef.current?.(value);
    resolverRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
            <p className="text-lg font-bold mb-6 text-gray-800">{state.message}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleChoice(false)}
                className="px-6 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 transition"
              >
                취소
              </button>
              <button
                onClick={() => handleChoice(true)}
                className="px-6 py-2 rounded-xl bg-red-500 hover:bg-red-600 font-bold text-white transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
