'use client';

interface AdminLoginProps {
  onLogin: (e: React.FormEvent) => void;
  adminId: string;
  adminPassword: string;
  onAdminIdChange: (v: string) => void;
  onAdminPasswordChange: (v: string) => void;
}

export default function AdminLogin({
  onLogin,
  adminId,
  adminPassword,
  onAdminIdChange,
  onAdminPasswordChange,
}: AdminLoginProps) {
  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl mt-16 text-center">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">👨‍🏫 선생님 로그인</h2>
      <form onSubmit={onLogin} className="space-y-4">
        <input
          type="text"
          placeholder="아이디"
          className="input-primary"
          value={adminId}
          onChange={(e) => onAdminIdChange(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          className="input-primary"
          value={adminPassword}
          onChange={(e) => onAdminPasswordChange(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary w-full mt-4">로그인</button>
      </form>
    </div>
  );
}
