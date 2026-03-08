import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Users, FileText, MessageSquare, Coffee, Flag, Loader2 } from 'lucide-react';

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard().then((res) => {
      setData(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
      <h1 className="text-2xl font-bold">대시보드</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Icon className="w-4 h-4" />
              {label}
            </div>
            <p className="text-2xl font-bold mt-1">{value?.toLocaleString() ?? 0}</p>
          </div>
        ))}
      </div>

      {(reportTrendByDay?.length || recentSignupCount != null) && (
        <div className="grid md:grid-cols-2 gap-4">
          {reportTrendByDay?.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h2 className="font-semibold mb-3">최근 7일 신고 추이</h2>
              <div className="space-y-1 text-sm">
                {reportTrendByDay.map((d: any) => (
                  <div key={d.date} className="flex justify-between">
                    <span>{d.date}</span>
                    <span>차록 {d.noteReports ?? 0} · 게시글 {d.postReports ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {recentSignupCount != null && (
            <div className="bg-white rounded-lg border p-4">
              <h2 className="font-semibold mb-3">최근 7일 가입자</h2>
              <p className="text-2xl font-bold">{recentSignupCount}명</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <Link to="/admin/reports" className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-600" />
            <span className="font-medium">미처리 신고</span>
          </div>
          <span className="text-xl font-bold text-amber-700">
            {(stats.pendingNoteReportCount ?? 0) + (stats.pendingPostReportCount ?? 0)}건
          </span>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <h2 className="font-semibold mb-3">최근 차록 신고</h2>
          {recentNoteReports?.length ? (
            <ul className="space-y-2">
              {recentNoteReports.map((r: any) => (
                <li key={r.id} className="text-sm border-b pb-2 last:border-0">
                  <Link to={`/admin/reports?tab=notes`} className="hover:underline">
                    #{r.id} - {r.reason} · {r.note?.memo?.slice(0, 30) || '(메모 없음)'}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-sm">미처리 신고 없음</p>
          )}
        </div>
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <h2 className="font-semibold mb-3">최근 게시글 신고</h2>
          {recentPostReports?.length ? (
            <ul className="space-y-2">
              {recentPostReports.map((r: any) => (
                <li key={r.id} className="text-sm border-b pb-2 last:border-0">
                  <Link to={`/admin/reports?tab=posts`} className="hover:underline">
                    #{r.id} - {r.reason} · {r.post?.title?.slice(0, 30) || '(제목 없음)'}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-sm">미처리 신고 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}
