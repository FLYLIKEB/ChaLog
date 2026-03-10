import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Header } from '../components/Header';
import { RatingVisualization } from '../components/RatingVisualization';
import { blindSessionsApi } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { ChartContainer } from '../components/ui/chart';

type ReportData = {
  tea: { id: number; name: string; type: string; year?: number } | null;
  participants: Array<{
    userId: number;
    userName: string;
    overallRating: number | null;
    axisValues: Array<{
      axisId: number;
      valueNumeric: number;
      axis?: { nameKo: string; maxValue?: number; displayOrder?: number };
    }>;
    tags: string[];
    memo: string | null;
  }>;
  stats: {
    avgOverallRating: number | null;
    axisAverages: Array<{ axisName: string; avg: number; count: number }>;
    tagDistribution: Array<{ name: string; count: number }>;
  };
};

export function BlindSessionReport() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!id) return;

    const fetchReport = async () => {
      try {
        const data = await blindSessionsApi.getReport(parseInt(id, 10));
        setReport(data);
      } catch (err) {
        logger.error('Failed to fetch report:', err);
        toast.error(err instanceof Error ? err.message : '리포트를 불러오는데 실패했습니다.');
        navigate(`/blind/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id, isAuthenticated, navigate]);

  if (loading || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const axisAverages = report.stats.axisAverages;
  const axisChartData = axisAverages.map((a) => ({
    name: a.axisName,
    평균: Math.round(a.avg * 10) / 10,
  }));
  const axisDomainMax = Math.max(...axisAverages.map((a) => a.avg), 5);

  const tagChartData = report.stats.tagDistribution.slice(0, 10).map((t) => ({
    name: t.name,
    빈도: t.count,
  }));

  return (
    <div className="min-h-screen">
      <Header showBack title="비교 리포트" showProfile showLogo />

      <div className="p-4 pb-24 space-y-6">
        {report.tea && (
          <div className="bg-card rounded-lg p-4 border border-border">
            <h2 className="text-lg font-semibold mb-1">{report.tea.name}</h2>
            <p className="text-sm text-muted-foreground">
              {report.tea.type}
              {report.tea.year && ` · ${report.tea.year}년`}
            </p>
          </div>
        )}

        {report.stats.avgOverallRating != null && (
          <div className="bg-card rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-2">평균 평점</h3>
            <p className="text-2xl font-bold">
              {report.stats.avgOverallRating.toFixed(1)}점
            </p>
          </div>
        )}

        {axisChartData.length > 0 && (
          <div className="bg-card rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-3">축별 평균</h3>
            <ChartContainer config={{ 평균: { label: '평균' } }} className="h-48">
              <BarChart data={axisChartData} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, axisDomainMax]} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Bar dataKey="평균" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        )}

        {tagChartData.length > 0 && (
          <div className="bg-card rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-3">태그 분포</h3>
            <ChartContainer config={{ 빈도: { label: '빈도' } }} className="h-48">
              <BarChart data={tagChartData} margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Bar dataKey="빈도" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">참가자별 기록</h3>
          {report.participants.map((p) => (
            <div
              key={p.userId}
              className="bg-card rounded-lg p-4 border border-border space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{p.userName}</span>
                {p.overallRating != null && (
                  <span className="text-sm text-muted-foreground">
                    {Number(p.overallRating).toFixed(1)}점
                  </span>
                )}
              </div>
              {p.axisValues && p.axisValues.length > 0 && (
                <RatingVisualization
                  axisValues={p.axisValues.map((av) => ({
                    axisId: av.axisId,
                    valueNumeric: av.valueNumeric,
                    axis: av.axis
                      ? {
                          id: av.axisId,
                          nameKo: av.axis.nameKo ?? `축 ${av.axisId}`,
                          maxValue: av.axis.maxValue ?? 5,
                          displayOrder: av.axis.displayOrder ?? 0,
                        }
                      : undefined,
                  }))}
                />
              )}
              {p.tags && p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-muted rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {p.memo && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {p.memo}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
