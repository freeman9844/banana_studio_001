'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { QUOTA_POLL_INTERVAL, DEFAULT_QUOTA } from '@/lib/constants';

export interface User {
  nickname: string;
  pin: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { data: quotaData, mutate } = useSWR(
    user ? `/api/quota?nickname=${encodeURIComponent(user.nickname)}` : null,
    fetcher,
    { refreshInterval: QUOTA_POLL_INTERVAL }
  );

  const currentQuota: number = quotaData?.remainingQuota ?? DEFAULT_QUOTA;

  useEffect(() => {
    setIsMounted(true);
    const savedUser = localStorage.getItem('banana_studio_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('banana_studio_user');
      }
    }
  }, []);

  const handleLogin = async (nickname: string, pin: string): Promise<void> => {
    const userData: User = { nickname, pin };
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '로그인에 실패했습니다.');
    }
    setUser(userData);
    localStorage.setItem('banana_studio_user', JSON.stringify(userData));
    mutate();
  };

  const handleLogout = (): void => {
    setUser(null);
    localStorage.removeItem('banana_studio_user');
  };

  return { user, currentQuota, isMounted, handleLogin, handleLogout };
}
