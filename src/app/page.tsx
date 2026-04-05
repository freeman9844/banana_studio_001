'use client';

import { useState, useEffect } from "react";
import Login from "@/components/Login";
import Studio from "@/components/Studio";
import Link from "next/link";

export default function Home() {
  const [user, setUser] = useState<{ nickname: string; pin: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [initialQuota, setInitialQuota] = useState(20);

  // Load saved user from localStorage on initial render
  useEffect(() => {
    setIsMounted(true);
    const savedUser = localStorage.getItem('banana_studio_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Fetch current quota after successful reload
        fetchCurrentQuota(parsedUser.nickname).then(q => setInitialQuota(q));
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
  }, []);

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

  const handleLogin = async (nickname: string, pin: string) => {
    const userData = { nickname, pin };
    setUser(userData);
    localStorage.setItem('banana_studio_user', JSON.stringify(userData));
    setInitialQuota(20); // Reset for new user

    // Register or update the student in the backend so they appear on the admin dashboard immediately
    try {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      // Fetch latest in case they were already registered before
      fetchCurrentQuota(nickname).then(q => setInitialQuota(q));
    } catch (error) {
      console.error("Failed to register student on login", error);
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
          <div className="mb-6 text-green-700 font-extrabold text-2xl drop-shadow-sm flex items-center justify-center">
            환영합니다, <span className="text-blue-600 mx-2 text-3xl">{user.nickname}</span>님! ✨
            <button 
              onClick={handleLogout}
              className="ml-4 text-base font-normal text-gray-500 underline hover:text-gray-700 transition"
            >
              (로그아웃)
            </button>
          </div>
          <Studio onGenerate={handleGenerate} initialQuota={initialQuota} />
          
          <div className="mt-8 text-center bg-blue-50 p-6 rounded-3xl border-2 border-blue-200 shadow-sm w-full max-w-2xl">
             <p className="text-gray-700 font-bold mb-3 text-lg">내 그림이나 장난감 사진으로 마법을 부리고 싶나요?</p>
             <Link href="/photo" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-md transition transform hover:scale-105">
                마법 사진관으로 가기 📸
             </Link>
          </div>
        </div>
      )}
    </div>
  );
}
