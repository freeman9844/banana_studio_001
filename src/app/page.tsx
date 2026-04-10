'use client';

import { useToast } from '@/components/ui/ToastContext';
import Login from '@/components/Login';
import Studio from '@/components/Studio';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

export default function Home() {
  const { user, currentQuota, isMounted, handleLogin, handleLogout } = useUser();
  const { showToast } = useToast();

  const handleLoginWithFeedback = async (nickname: string, pin: string) => {
    try {
      await handleLogin(nickname, pin);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : '로그인에 실패했습니다.', 'error');
    }
  };

  const handleGenerate = async (prompt: string): Promise<{ imageUrl: string; remainingQuota: number }> => {
    if (!user) throw new Error('Not logged in');
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, user }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to generate image');
    return { imageUrl: data.imageUrl, remainingQuota: data.remainingQuota };
  };

  if (!isMounted) {
    return <div className="flex h-screen items-center justify-center">마법을 준비하는 중... 🪄</div>;
  }

  return (
    <div className="w-full flex justify-center">
      {!user ? (
        <Login onLogin={handleLoginWithFeedback} />
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="mb-4 w-full max-w-2xl flex justify-between items-center px-4">
            <button
              onClick={handleLogout}
              className="text-sm font-normal text-gray-500 underline hover:text-gray-700 transition"
            >
              (로그아웃)
            </button>
            <Link href="/photo" className="text-gray-500 hover:text-green-600 font-bold underline transition">
              마법 사진관으로 가기 📸 →
            </Link>
          </div>
          <div className="mb-6 text-green-700 font-extrabold text-2xl drop-shadow-sm flex items-center justify-center">
            환영합니다, <span className="text-blue-600 mx-2 text-3xl">{user.nickname}</span>님! ✨
          </div>
          <Studio onGenerate={handleGenerate} initialQuota={currentQuota} />
        </div>
      )}
    </div>
  );
}
