'use client';

import { useState, useEffect } from "react";
import useSWR from 'swr';
import Login from "@/components/Login";
import Studio from "@/components/Studio";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Home() {
  const [user, setUser] = useState<{ nickname: string, pin: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { data: quotaData, mutate } = useSWR(
    user ? `/api/quota?nickname=${encodeURIComponent(user.nickname)}` : null, 
    fetcher, 
    { refreshInterval: 5000 }
  );

  const currentQuota = quotaData?.remainingQuota ?? 20;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const savedUser = localStorage.getItem('banana_studio_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
  }, []);

  const handleLogin = async (nickname: string, pin: string) => {
    const userData = { nickname, pin };

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || '로그인에 실패했습니다.');
        return;
      }

      // Only log in if server validated the credentials
      setUser(userData);
      localStorage.setItem('banana_studio_user', JSON.stringify(userData));
      mutate();
    } catch (error) {
      console.error("Failed to register/login student", error);
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('banana_studio_user');
  };

  const handleGenerate = async (prompt: string): Promise<{imageUrl: string, remainingQuota: number}> => {
    if (!user) throw new Error("Not logged in");

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, user }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate image');
    }

    return { imageUrl: data.imageUrl, remainingQuota: data.remainingQuota };
  };

  // Prevent hydration mismatch by not rendering the dynamic UI until mounted on client
  if (!isMounted) {
    return <div className="flex h-screen items-center justify-center">마법을 준비하는 중... 🪄</div>;
  }

  return (
    <div className="w-full flex justify-center">
      {!user ? (
        <Login onLogin={handleLogin} />
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
