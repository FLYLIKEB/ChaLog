import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Cpu,
  Database,
  HardDrive,
  Clock,
  Activity,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

type LogLevel = 'error' | 'warn' | 'all';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(' ');
}

export function AdminMonitoring() {
  const [metrics, setMetrics] = useState<any>(null);
  const [logData, setLogData] = useState<{
    logs: any[];
    errorCount: number;
    warnCount: number;
    totalCount: number;
  } | null>(null);
  const [level, setLevel] = useState<LogLevel>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = () => {
    setLoading(true);
    setError(null);
    Promise.all([adminApi.getMetrics(), adminApi.getLogs({ level, limit: 50 })])
      .then(([m, l]) => {
        setMetrics(m);
        setLogData(l);
      })
      .catch((e: any) => setError(e?.message || '로딩에 실패했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, [level]);

  const tabs: { value: LogLevel; label: string; icon: React.ElementType }[] = [
    { value: 'all', label: '전체', icon: AlertCircle },
    { value: 'error', label: '에러', icon: AlertCircle },
    { value: 'warn', label: '경고', icon: AlertTriangle },
  ];

  const logs = logData?.logs ?? [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-foreground">
          <Activity className="w-7 h-7 text-primary" />
          모니터링
        </h1>
        <Button variant="secondary" onClick={fetchAll} disabled={loading} className="self-start sm:self-auto">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 서버 메트릭 패널 */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/50">
          <span className="text-sm font-medium text-muted-foreground">서버 메트릭</span>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <HardDrive className="w-4 h-4" />
              메모리 (heap)
            </div>
            <p className="text-xl font-semibold text-foreground font-mono">
              {metrics?.memory?.heapUsedMB ?? '-'} MB
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Cpu className="w-4 h-4" />
              부하 (1/5/15분)
            </div>
            <p className="text-sm font-semibold text-foreground font-mono">
              {metrics?.cpu?.loadAvg?.map((v: number) => v.toFixed(2)).join(' / ') ?? '-'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Database className="w-4 h-4" />
              DB 연결
            </div>
            <p className="text-xl font-semibold text-foreground font-mono">
              {metrics?.database?.connections ?? '-'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="w-4 h-4" />
              업타임
            </div>
            <p className="text-xl font-semibold text-foreground font-mono">
              {metrics ? formatUptime(metrics.uptimeSeconds ?? 0) : '-'}
            </p>
          </div>
        </div>
      </Card>

      {/* 로그 패널 */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/50 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">서버 로그</span>
          <div className="flex gap-2 ml-auto">
            {tabs.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setLevel(value)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  level === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {value === 'all' && logData && (
                  <span className="opacity-80">({logData.totalCount})</span>
                )}
                {value === 'error' && logData && logData.errorCount > 0 && (
                  <span className="opacity-80">({logData.errorCount})</span>
                )}
                {value === 'warn' && logData && logData.warnCount > 0 && (
                  <span className="opacity-80">({logData.warnCount})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border-b border-destructive/30">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAll} className="mt-2">
              다시 시도
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              {level === 'all'
                ? '최근 로그가 없습니다. (프로세스 재시작 시 초기화됨)'
                : `${level === 'error' ? '에러' : '경고'} 로그가 없습니다.`}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">레벨</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">일시</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">상태</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">메서드</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">경로</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">메시지</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((e: any, i: number) => (
                  <tr
                    key={i}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          e.level === 'error'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {e.level === 'error' ? 'error' : 'warn'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-foreground font-mono">
                      {e.timestamp ? new Date(e.timestamp).toLocaleString() : '-'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                        {e.statusCode}
                      </span>
                    </td>
                    <td className="p-3 text-sm font-mono text-foreground">{e.method ?? '-'}</td>
                    <td className="p-3 text-sm font-mono text-foreground max-w-[200px] truncate" title={e.path}>
                      {e.path ?? '-'}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground max-w-[300px] truncate" title={e.message}>
                      {e.message ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {logs.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              최근 50건만 표시됩니다. 프로세스 재시작 시 초기화됩니다.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
