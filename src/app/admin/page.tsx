'use client';

import { useState, useEffect } from 'react';

interface QuotaData {
  nickname: string;
  usage: number;
  remaining: number;
  pin?: string;
}

export default function AdminDashboard() {
  const [quotas, setQuotas] = useState<QuotaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminId === 'admin' && adminPassword === 'admin') {
      setIsAuthenticated(true);
    } else {
      alert('관리자 아이디 또는 비밀번호가 틀렸습니다.');
    }
  };

  const fetchQuotas = async () => {
    try {
      const res = await fetch('/api/admin/quotas');
      const data = await res.json();
      setQuotas(data.quotas || []);
    } catch (error) {
      console.error("Failed to fetch quotas", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchQuotas();
    // Poll every 5 seconds to keep dashboard updated
    const interval = setInterval(fetchQuotas, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleReset = async (nickname: string, amount: number = 20) => {
    if (!confirm(nickname === 'ALL' ? `모든 학생의 마법 횟수를 ${amount}번으로 초기화하시겠습니까?` : `[${nickname}] 학생의 횟수를 ${amount}번으로 설정하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/quotas/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, action: 'RESET', amount })
      });
      
      if (res.ok) {
        fetchQuotas(); // Refresh immediately
      } else {
        alert('초기화에 실패했습니다.');
      }
    } catch (error) {
      console.error("Reset failed", error);
    }
  };

  const handleDelete = async (nickname: string) => {
    if (!confirm(`정말로 [${nickname}] 학생 정보를 완전히 삭제하시겠습니까? 삭제된 정보는 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/quotas/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, action: 'DELETE' })
      });
      
      if (res.ok) {
        fetchQuotas(); // Refresh immediately
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl mt-16 text-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">👨‍🏫 선생님 로그인</h2>
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="아이디"
              className="input-primary"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="비밀번호"
              className="input-primary"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full mt-4">
            로그인
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white rounded-3xl shadow-xl mt-8">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">👨‍🏫 선생님 관리자 화면</h1>
        <button 
          onClick={() => handleReset('ALL')}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl transition shadow-md"
        >
          전체 횟수 초기화 🔄
        </button>
      </div>

      {isLoading && quotas.length === 0 ? (
        <div className="text-center text-gray-500 py-10">데이터를 불러오는 중입니다...</div>
      ) : quotas.length === 0 ? (
        <div className="text-center text-gray-500 py-10">아직 마법을 사용한 학생이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-4 rounded-tl-xl font-bold">학생 이름 (별명)</th>
                <th className="p-4 font-bold text-center">비밀번호</th>
                <th className="p-4 font-bold">사용 횟수</th>
                <th className="p-4 font-bold">남은 횟수</th>
                <th className="p-4 rounded-tr-xl text-right font-bold">관리</th>
              </tr>
            </thead>
            <tbody>
              {quotas.map((q, i) => (
                <tr key={i} className="border-b hover:bg-gray-50 transition">
                  <td className="p-4 font-bold text-lg text-blue-600">{q.nickname}</td>
                  <td className="p-4 text-center">
                    <span className="font-mono bg-gray-200 px-2 py-1 rounded text-gray-700 tracking-widest">{q.pin || '----'}</span>
                  </td>
                  <td className="p-4">
                    <div className="w-full bg-gray-200 rounded-full h-4 max-w-[200px] shadow-inner">
                      <div 
                        className={`h-4 rounded-full transition-all duration-500 ${q.remaining <= 5 ? 'bg-red-500' : 'bg-green-500'}`} 
                        style={{ width: `${(q.usage / 20) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 mt-1 inline-block">{q.usage} / 20</span>
                  </td>
                  <td className="p-4">
                    <span className={`font-bold px-3 py-1 rounded-full text-sm shadow-sm ${q.remaining <= 5 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                      {q.remaining}번
                    </span>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => handleReset(q.nickname, 5)}
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-semibold py-2 px-3 rounded-lg text-sm transition shadow-sm border border-yellow-200"
                      title="마법 5번(1/4) 충전"
                    >
                      1/4 충전 ⚡
                    </button>
                    <button 
                      onClick={() => handleReset(q.nickname, 20)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 px-3 rounded-lg text-sm transition shadow-sm border border-blue-200"
                      title="마법 20번(가득) 충전"
                    >
                      가득 충전 🔋
                    </button>
                    <button 
                      onClick={() => handleDelete(q.nickname)}
                      className="bg-gray-100 hover:bg-red-100 hover:text-red-700 text-gray-500 font-semibold py-2 px-3 rounded-lg text-sm transition shadow-sm border border-gray-200 hover:border-red-200"
                      title="학생 정보 삭제"
                    >
                      삭제 🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}