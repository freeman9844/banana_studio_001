'use client';

interface GlobalConfig {
  maxQuota: number;
  resolution: '512' | '1024';
}

interface AdminSettingsProps {
  config: GlobalConfig;
  onSettingChange: (field: 'maxQuota' | 'resolution', value: string | number) => void;
}

export default function AdminSettings({ config, onSettingChange }: AdminSettingsProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-6 mb-8 shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4">⚙️ 전체 학생 공통 설정</h2>
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col flex-1">
          <label className="font-semibold text-gray-700 mb-2">마법 한도 (하루)</label>
          <select
            className="border rounded-lg p-2 text-md bg-white shadow-sm"
            value={config.maxQuota}
            onChange={(e) => onSettingChange('maxQuota', Number(e.target.value))}
          >
            {[1, 5, 10, 20].map((n) => (
              <option key={n} value={n}>{n}번</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col flex-1">
          <label className="font-semibold text-gray-700 mb-2">그림 화질</label>
          <select
            className="border rounded-lg p-2 text-md bg-white shadow-sm"
            value={config.resolution}
            onChange={(e) => onSettingChange('resolution', e.target.value)}
          >
            <option value="1024">고화질 (1k)</option>
            <option value="512">저화질 (0.5k)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
