import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';

export function AdminAudit() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .getAuditLogs({ limit: 100 })
      .then(setData)
      .catch((e: any) => setError(e?.message || '감사 로그 로딩에 실패했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">감사 로그</h1>
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">{error}</div>
      )}
      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">ID</th>
                <th className="p-3 text-left text-sm font-medium">운영자</th>
                <th className="p-3 text-left text-sm font-medium">작업</th>
                <th className="p-3 text-left text-sm font-medium">대상</th>
                <th className="p-3 text-left text-sm font-medium">사유</th>
                <th className="p-3 text-left text-sm font-medium">일시</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((log: any) => (
                <tr key={log.id} className="border-b">
                  <td className="p-3 text-sm">{log.id}</td>
                  <td className="p-3 text-sm">{log.adminId}</td>
                  <td className="p-3 text-sm">{log.action}</td>
                  <td className="p-3 text-sm">{log.targetType != null && log.targetId != null ? `${log.targetType} #${log.targetId}` : '-'}</td>
                  <td className="p-3 text-sm max-w-[200px] truncate">{log.reason || '-'}</td>
                  <td className="p-3 text-sm">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
