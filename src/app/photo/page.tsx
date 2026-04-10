'use client';

import { useToast } from '@/components/ui/ToastContext';
import Login from '@/components/Login';
import PhotoStudio from '@/components/PhotoStudio';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

export default function PhotoPage() {
  const { user, currentQuota, isMounted, handleLogin, handleLogout } = useUser();
  const { showToast } = useToast();

  const handleLoginWithFeedback = async (nickname: string, pin: string) => {
    try {
      await handleLogin(nickname, pin);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : '로그인에 실패했습니다.', 'error');
    }
  };

  const handleGenerate = async (
    prompt: string,
    referenceImageBase64: string,
    referenceMimeType: string
  ): Promise<{ imageUrl: string; remainingQuota: number }> => {
    if (!user) throw new Error('Not logged in');
    const response = await fetch('/api/generate-with-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, user, referenceImageBase64, referenceMimeType }),
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
        <div className="flex flex-col items-center">
          <Login onLogin={handleLoginWithFeedback} />
          <Link href="/" className="mt-6 text-gray-500 hover:text-green-600 font-bold underline transition">
            ← 기본 스튜디오로 돌아가기
          </Link>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="mb-4 w-full max-w-2xl flex justify-between items-center px-4">
            <Link href="/" className="text-gray-500 hover:text-green-600 font-bold underline transition">
              ← 텍스트로만 그리기
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm font-normal text-gray-500 underline hover:text-gray-700 transition"
            >
              (로그아웃)
            </button>
          </div>
          <div className="mb-2 text-blue-700 font-extrabold text-2xl drop-shadow-sm flex items-center justify-center">
            <span className="text-green-600 mx-2 text-3xl">{user.nickname}</span>의 마법 사진관 🖼️
          </div>
          <PhotoStudio onGenerate={handleGenerate} initialQuota={currentQuota} />
        </div>
      )}
    </div>
  );
}
