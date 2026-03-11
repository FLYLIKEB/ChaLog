import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Users, FileText, MessageSquare, Coffee, Flag, Loader2, Activity } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = () => {
    setLoading(true);
    setError(null);
    adminApi
      .getDashboard()
      .then((res) => {
        setData(res);
      })
      .catch((e: any) => {
        setError(e?.message || '대시보드 로딩에 실패했습니다.');
      })
      .finally(() => setLoading(false));
    adminApi.getMetrics().then(setMetrics).catch(() => setMetrics(null));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchDashboard} className="mt-3">
            다시 시도
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recentNoteReports, recentPostReports, reportTrendByDay, recentSignupCount } = data;

  const cards = [
    { label: '사용자', value: stats.userCount, icon: Users },
    { label: '차록', value: stats.noteCount, icon: FileText },
    { label: '게시글', value: stats.postCount, icon: MessageSquare },
    { label: '차', value: stats.teaCount, icon: Coffee },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">대시보드</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Icon className="w-4 h-4" />
              {label}
            </div>
            <p className="text-2xl font-bold mt-1 text-foreground">{value?.toLocaleString() ?? 0}</p>
          </Card>
        ))}
      </div>

      {metrics && (
        <Card className="p-4">
          <Link to="/admin/monitoring" className="flex items-center justify-between hover:opacity-90 transition-opacity">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">서버 모니터링</span>
            </div>
            <span className="text-muted-foreground text-sm">
              메트릭·로그 보기 →
            </span>
          </Link>
        </Card>
      )}

      {(reportTrendByDay?.length || recentSignupCount != null) && (
        <div className="grid md:grid-cols-2 gap-4">
          {reportTrendByDay?.length > 0 && (
            <Card className="p-4">
              <h2 className="font-semibold mb-3 text-foreground">최근 7일 신고 추이</h2>
              <div className="space-y-1 text-sm text-muted-foreground">
                {reportTrendByDay.map((d: any) => (
                  <div key={d.date} className="flex justify-between">
                    <span>{d.date}</span>
                    <span>차록 {d.noteReports ?? 0} · 게시글 {d.postReports ?? 0}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {recentSignupCount != null && (
            <Card className="p-4">
              <h2 className="font-semibold mb-3 text-foreground">최근 7일 가입자</h2>
              <p className="text-2xl font-bold text-foreground">{recentSignupCount}명</p>
            </Card>
          )}
        </div>
      )}

      <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
        <Link to="/admin/reports" className="flex items-center justify-between hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-foreground">미처리 신고</span>
          </div>
          <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
            {(stats.pendingNoteReportCount ?? 0) + (stats.pendingPostReportCount ?? 0)}건
          </span>
        </Link>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="font-semibold mb-3 text-foreground">최근 차록 신고</h2>
          {recentNoteReports?.length ? (
            <ul className="space-y-2">
              {recentNoteReports.map((r: any) => (
                <li key={r.id} className="text-sm border-b border-border pb-2 last:border-0">
                  <Link to={`/admin/reports?tab=notes`} className="hover:underline text-foreground">
                    #{r.id} - {r.reason} · {r.note?.memo?.slice(0, 30) || '(메모 없음)'}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">미처리 신고 없음</p>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold mb-3 text-foreground">최근 게시글 신고</h2>
          {recentPostReports?.length ? (
            <ul className="space-y-2">
              {recentPostReports.map((r: any) => (
                <li key={r.id} className="text-sm border-b border-border pb-2 last:border-0">
                  <Link to={`/admin/reports?tab=posts`} className="hover:underline text-foreground">
                    #{r.id} - {r.reason} · {r.post?.title?.slice(0, 30) || '(제목 없음)'}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">미처리 신고 없음</p>
          )}
        </Card>
      </div>
    </div>
  );
}
