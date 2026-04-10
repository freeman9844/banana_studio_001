import type { Metadata } from 'next';
import Image from 'next/image';
import './globals.css';
import { ToastProvider } from '@/components/ui/ToastContext';
import { Toast } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmModal';

export const metadata: Metadata = {
  title: '마법의 그림 스튜디오',
  description: '내가 적은 대로 그림이 짜잔!',
  icons: { icon: '/magic-icon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col">
        <ToastProvider>
          <ConfirmProvider>
            <header className="bg-white p-4 shadow-md text-center flex items-center justify-center gap-3">
              <Image
                src="/magic-icon.png"
                alt="마법의 그림 스튜디오 아이콘"
                width={48}
                height={48}
                className="rounded-xl shadow-sm"
              />
              <h1 className="text-3xl font-bold text-green-600">마법의 그림 스튜디오</h1>
            </header>
            <main className="flex-grow flex items-center justify-center p-4">
              {children}
            </main>
            <Toast />
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
