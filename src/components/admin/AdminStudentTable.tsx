'use client';

interface QuotaData {
  nickname: string;
  usage: number;
  remaining: number;
}

interface GlobalConfig {
  maxQuota: number;
  resolution: '512' | '1024';
}

interface AdminStudentTableProps {
  quotas: QuotaData[];
  config: GlobalConfig;
  isLoading: boolean;
  onReset: (nickname: string, amount: number, action: 'RESET' | 'ADD') => void;
  onDelete: (nickname: string) => void;
}

export default function AdminStudentTable({
  quotas,
  config,
  isLoading,
  onReset,
  onDelete,
}: AdminStudentTableProps) {
  if (isLoading && quotas.length === 0) {
    return <div className="text-center text-gray-500 py-10">데이터를 불러오는 중입니다...</div>;
  }
  if (quotas.length === 0) {
    return <div className="text-center text-gray-500 py-10">아직 마법을 사용한 학생이 없습니다.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-700">
            <th className="p-4 rounded-tl-xl font-bold">학생 이름 (별명)</th>
            <th className="p-4 font-bold">사용 횟수</th>
            <th className="p-4 font-bold">남은 횟수</th>
            <th className="p-4 rounded-tr-xl text-right font-bold">관리</th>
          </tr>
        </thead>
        <tbody>
          {quotas.map((q, i) => (
            <tr key={i} className="border-b hover:bg-gray-50 transition">
              <td className="p-4 font-bold text-lg text-blue-600">{q.nickname}</td>
              <td className="p-4">
                <div className="w-full bg-gray-200 rounded-full h-4 max-w-[200px] shadow-inner">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${q.remaining <= 5 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, (q.usage / config.maxQuota) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-500 mt-1 inline-block">
                  {q.usage} / {config.maxQuota}
                </span>
              </td>
              <td className="p-4">
                <span className={`font-bold px-3 py-1 rounded-full text-sm shadow-sm ${q.remaining <= 5 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                  {q.remaining}번
                </span>
              </td>
              <td className="p-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onReset(q.nickname, 5, 'ADD')}
                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-semibold py-2 px-3 rounded-lg text-sm transition shadow-sm border border-yellow-200"
                  >
                    5번 충전 ⚡
                  </button>
                  <button
                    onClick={() => onReset(q.nickname, 20, 'RESET')}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 px-3 rounded-lg text-sm transition shadow-sm border border-blue-200"
                  >
                    가득 충전 🔋
                  </button>
                  <button
                    onClick={() => onDelete(q.nickname)}
                    className="bg-gray-100 hover:bg-red-100 hover:text-red-700 text-gray-500 font-semibold py-2 px-3 rounded-lg text-sm transition shadow-sm border border-gray-200 hover:border-red-200"
                  >
                    삭제 🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
