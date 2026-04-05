'use client';

import { useState, useEffect } from "react";
import Login from "@/components/Login";
import PhotoStudio from "@/components/PhotoStudio";
import Link from "next/link";

export default function PhotoPage() {
  const [user, setUser] = useState<{ nickname: string; pin: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [initialQuota, setInitialQuota] = useState(20);

  const fetchCurrentQuota = async (nickname: string) => {
     try {
       const res = await fetch(`/api/quota?nickname=${encodeURIComponent(nickname)}`);
       if (res.ok) {
         const data = await res.json();
         return data.remainingQuota;
       }
     } catch (e) {
       console.error("Failed to fetch quota", e);
     }
     return 20; // Default fallback
  };

  useEffect(() => {
    setIsMounted(true);
    const savedUser = localStorage.getItem('banana_studio_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        fetchCurrentQuota(parsedUser.nickname).then(q => setInitialQuota(q));
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
  }, []);

  const handleLogin = async (nickname: string, pin: string) => {
    const userData = { nickname, pin };
    setUser(userData);
    localStorage.setItem('banana_studio_user', JSON.stringify(userData));
    setInitialQuota(20); // Reset for new user

    try {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      fetchCurrentQuota(nickname).then(q => setInitialQuota(q));
    } catch (error) {
      console.error("Failed to register student on login", error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('banana_studio_user');
  };

  const handleGenerate = async (prompt: string, referenceImageBase64: string, referenceMimeType: string): Promise<{imageUrl: string, remainingQuota: number}> => {
    if (!user) throw new Error("Not logged in");

    const response = await fetch('/api/generate-with-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, user, referenceImageBase64, referenceMimeType }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate image');
    }

    return { imageUrl: data.imageUrl, remainingQuota: data.remainingQuota };
  };

  if (!isMounted) {
    return <div className="flex h-screen items-center justify-center">마법을 준비하는 중... 🪄</div>;
  }

  return (
    <div className="w-full flex justify-center">
      {!user ? (
        <div className="flex flex-col items-center">
            <Login onLogin={handleLogin} />
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
          <PhotoStudio onGenerate={handleGenerate} initialQuota={initialQuota} />
        </div>
      )}
    </div>
  );
}