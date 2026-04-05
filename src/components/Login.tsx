'use client';

import { useState } from 'react';

interface LoginProps {
  onLogin: (nickname: string, pin: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && pin.length === 4) {
      onLogin(nickname.trim(), pin);
    } else {
      alert('별명과 4자리 비밀번호를 확인해주세요!');
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
      <h2 className="text-2xl font-bold mb-6">스튜디오 입장하기</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="나의 멋진 별명"
            className="input-primary"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={10}
            required
          />
        </div>
        <div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="비밀번호 4자리 (숫자)"
            className="input-primary text-center tracking-widest"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            maxLength={4}
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full mt-4">
          시작하기! 🚀
        </button>
      </form>
    </div>
  );
}