'use client';

import { useState } from "react";
import Login from "@/components/Login";
import Studio from "@/components/Studio";

export default function Home() {
  const [user, setUser] = useState<{ nickname: string; pin: string } | null>(null);

  const handleLogin = (nickname: string, pin: string) => {
    // In a real app, this would hit an API to verify/create user
    // For this simple version, we trust the client state
    setUser({ nickname, pin });
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

  return (
    <div className="w-full flex justify-center">
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="mb-6 text-green-700 font-extrabold text-2xl drop-shadow-sm flex items-center justify-center">
            환영합니다, <span className="text-blue-600 mx-2 text-3xl">{user.nickname}</span>님! ✨
            <button 
              onClick={() => setUser(null)}
              className="ml-4 text-base font-normal text-gray-500 underline hover:text-gray-700 transition"
            >
              (로그아웃)
            </button>
          </div>
          <Studio onGenerate={handleGenerate} />
        </div>
      )}
    </div>
  );
}
