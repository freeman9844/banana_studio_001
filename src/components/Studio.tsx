/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastContext';
import { DEFAULT_QUOTA } from '@/lib/constants';

interface StudioProps {
  onGenerate: (prompt: string) => Promise<{ imageUrl: string; remainingQuota: number }>;
  initialQuota?: number;
}

export default function Studio({ onGenerate, initialQuota = DEFAULT_QUOTA }: StudioProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [quota, setQuota] = useState<number>(initialQuota);
  const { showToast } = useToast();

  useEffect(() => {
    setQuota(initialQuota);
  }, [initialQuota]);

  const handleGenerate = async () => {
    if (!prompt.trim() || quota <= 0) return;
    setIsLoading(true);
    setImageUrl(null);
    try {
      const result = await onGenerate(prompt);
      setImageUrl(result.imageUrl);
      if (result.remainingQuota !== undefined) setQuota(result.remainingQuota);
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? `그림을 그리는 중 문제가 생겼어요: ${error.message}` : '그림을 그리는 중 알 수 없는 문제가 생겼어요.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-2xl w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-center flex-grow">어떤 그림을 그릴까요?</h2>
      </div>
      <div className="w-full text-right mb-2">
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${quota > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          🪄 남은 마법: {quota}번
        </span>
      </div>
      <textarea
        className="input-primary h-32 resize-none mb-6"
        placeholder="예: 우주에서 자전거를 타는 고양이..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isLoading || quota <= 0}
      />
      <button
        onClick={handleGenerate}
        disabled={isLoading || !prompt.trim() || quota <= 0}
        className={`btn-primary w-full mb-8 ${isLoading || quota <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {quota <= 0 ? '오늘의 마법을 다 썼어요 🌙' : '그림 만들기! 🪄'}
      </button>
      {isLoading && (
        <div className="my-8 flex flex-col items-center justify-center animate-pulse">
          <div className="text-6xl animate-bounce mb-4">🪄✨</div>
          <p className="text-xl font-bold text-green-600">마법의 물감을 섞고 있어요...</p>
          <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요!</p>
        </div>
      )}
      {imageUrl && !isLoading && (
        <div className="mt-4 w-full flex flex-col items-center">
          <img src={imageUrl} alt="생성된 그림" className="rounded-xl shadow-lg max-w-full h-auto object-contain border-4 border-yellow-300" />
          <a href={imageUrl} download="my_magic_picture.png" className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full">
            💾 내 컴퓨터에 저장하기
          </a>
        </div>
      )}
    </div>
  );
}
