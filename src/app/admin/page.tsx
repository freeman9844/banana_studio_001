'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminStudentTable from '@/components/admin/AdminStudentTable';
import { useToast } from '@/components/ui/ToastContext';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { DEFAULT_QUOTA } from '@/lib/constants';

interface QuotaData {
  nickname: string;
  usage: number;
  remaining: number;
}

interface GlobalConfig {
  maxQuota: number;
  resolution: '512' | '1024';
}

export default function AdminDashboard() {
  const [quotas, setQuotas] = useState<QuotaData[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({ maxQuota: DEFAULT_QUOTA, resolution: '1024' });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const { showToast } = useToast();
  const confirm = useConfirm();

  const fetchQuotas = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/quotas');
      if (res.status === 401) { setIsAuthenticated(false); setIsLoading(false); return; }
      setIsAuthenticated(true);
      const data = await res.json();
      setQuotas(data.quotas || []);
      if (data.config) setGlobalConfig(data.config);
    } catch {
      showToast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adminId, password: adminPassword }),
      });
      if (res.ok) { setIsAuthenticated(true); fetchQuotas(); }
      else showToast('관리자 아이디 또는 비밀번호가 틀렸습니다.', 'error');
    } catch {
      showToast('로그인 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  useEffect(() => {
    fetchQuotas();
    const interval = setInterval(() => { if (isAuthenticated) fetchQuotas(); }, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchQuotas]);

  const handleGlobalSettingChange = async (field: 'maxQuota' | 'resolution', value: string | number) => {
    const newConfig = { ...globalConfig, [field]: value };
    setGlobalConfig(newConfig);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (!res.ok) { showToast('설정 변경에 실패했습니다.', 'error'); fetchQuotas(); }
    } catch {
      showToast('설정 변경 중 오류가 발생했습니다.', 'error');
      fetchQuotas();
    }
  };

  const handleReset = async (nickname: string, amount: number, actionType: 'RESET' | 'ADD' = 'RESET') => {
    const msg = actionType === 'RESET'
      ? nickname === 'ALL'
        ? `모든 학생의 마법 횟수를 ${amount}번으로 초기화하시겠습니까?`
        : `[${nickname}] 학생의 횟수를 ${amount}번으로 설정하시겠습니까?`
      : `[${nickname}] 학생에게 마법 횟수 ${amount}번을 충전하시겠습니까?`;

    if (!(await confirm(msg))) return;

    try {
      const res = await fetch('/api/admin/quotas/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, action: actionType, amount }),
      });
      if (res.ok) { fetchQuotas(); showToast('완료되었습니다.', 'success'); }
      else showToast('충전에 실패했습니다.', 'error');
    } catch {
      showToast('오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (nickname: string) => {
    if (!(await confirm(`정말로 [${nickname}] 학생 정보를 완전히 삭제하시겠습니까?`))) return;
    try {
      const res = await fetch('/api/admin/quotas/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, action: 'DELETE' }),
      });
      if (res.ok) { fetchQuotas(); showToast(`${nickname} 학생이 삭제되었습니다.`, 'success'); }
      else showToast('삭제에 실패했습니다.', 'error');
    } catch {
      showToast('오류가 발생했습니다.', 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLogin={handleAdminLogin}
        adminId={adminId}
        adminPassword={adminPassword}
        onAdminIdChange={setAdminId}
        onAdminPasswordChange={setAdminPassword}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white rounded-3xl shadow-xl mt-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">👨‍🏫 선생님 관리자 화면</h1>
        <button
          onClick={() => handleReset('ALL', globalConfig.maxQuota)}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl transition shadow-md"
        >
          전체 횟수 초기화 🔄
        </button>
      </div>
      <AdminSettings config={globalConfig} onSettingChange={handleGlobalSettingChange} />
      <AdminStudentTable
        quotas={quotas}
        config={globalConfig}
        isLoading={isLoading}
        onReset={handleReset}
        onDelete={handleDelete}
      />
    </div>
  );
}
