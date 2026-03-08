import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Loader2, ExternalLink, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

function ReportRow({
  r,
  type,
  onDismiss,
  onAction,
}: {
  r: any;
  type: 'note' | 'post';
  onDismiss: (type: 'note' | 'post', id: number) => void;
  onAction: (report: { type: 'note' | 'post'; id: number }) => void;
}) {
  return (
    <tr className="border-b">
      <td className="p-3 text-sm">{r.id}</td>
      <td className="p-3 text-sm">{r.reason}</td>
      <td className="p-3 text-sm">{r.status}</td>
      <td className="p-3 text-sm">{r.reportCount}</td>
      <td className="p-3 text-sm">
        {type === 'note' ? (r.note?.memo?.slice(0, 50) || '-') : (r.post?.title?.slice(0, 50) || '-')}
      </td>
      <td className="p-3">
        <div className="flex gap-2">
          {type === 'note' && r.noteId && (
            <Link to={`/note/${r.noteId}`} target="_blank" className="text-primary text-sm flex items-center gap-1">
              <ExternalLink className="w-4 h-4" />
              보기
            </Link>
          )}
          {type === 'post' && r.postId && (
            <Link to={`/chadam/${r.postId}`} target="_blank" className="text-primary text-sm flex items-center gap-1">
              <ExternalLink className="w-4 h-4" />
              보기
            </Link>
          )}
          {r.status === 'pending' && (
            <>
              <Button size="sm" variant="outline" onClick={() => onDismiss(type, r.id)}>
                <Check className="w-4 h-4 mr-1" />
                무시
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onAction({ type, id: r.id })}>
                <Trash2 className="w-4 h-4 mr-1" />
                조치
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function AdminReports() {
  const [tab, setTab] = useState<'notes' | 'posts'>('notes');
  const [noteData, setNoteData] = useState<any>(null);
  const [postData, setPostData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionReport, setActionReport] = useState<{ type: 'note' | 'post'; id: number } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const fetchNoteReports = () =>
    adminApi.getNoteReports({ status: statusFilter || undefined, limit: 50 }).then(setNoteData);

  const fetchPostReports = () =>
    adminApi.getPostReports({ status: statusFilter || undefined, limit: 50 }).then(setPostData);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchNoteReports(), fetchPostReports()]).finally(() => setLoading(false));
  }, [statusFilter]);

  const handleDismiss = async (type: 'note' | 'post', id: number) => {
    try {
      if (type === 'note') await adminApi.dismissNoteReport(id);
      else await adminApi.dismissPostReport(id);
      toast.success('신고를 무시했습니다.');
      if (type === 'note') fetchNoteReports();
      else fetchPostReports();
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleAction = async () => {
    if (!actionReport) return;
    try {
      if (actionReport.type === 'note') await adminApi.actionNoteReport(actionReport.id, actionReason);
      else await adminApi.actionPostReport(actionReport.id, actionReason);
      toast.success('조치를 완료했습니다.');
      setActionReport(null);
      setActionReason('');
      if (actionReport.type === 'note') fetchNoteReports();
      else fetchPostReports();
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">신고 관리</h1>

      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">전체</option>
          <option value="pending">대기</option>
          <option value="dismissed">무시됨</option>
          <option value="acted">조치됨</option>
        </select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="notes">차록 신고 ({noteData?.total ?? 0})</TabsTrigger>
          <TabsTrigger value="posts">게시글 신고 ({postData?.total ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="notes" className="mt-4">
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <div className="bg-white rounded-lg border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-3 text-left text-sm font-medium">ID</th>
                    <th className="p-3 text-left text-sm font-medium">사유</th>
                    <th className="p-3 text-left text-sm font-medium">상태</th>
                    <th className="p-3 text-left text-sm font-medium">신고수</th>
                    <th className="p-3 text-left text-sm font-medium">내용</th>
                    <th className="p-3 text-left text-sm font-medium">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {noteData?.items?.map((r: any) => (
                  <ReportRow key={r.id} r={r} type="note" onDismiss={handleDismiss} onAction={setActionReport} />
                ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="posts" className="mt-4">
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <div className="bg-white rounded-lg border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-3 text-left text-sm font-medium">ID</th>
                    <th className="p-3 text-left text-sm font-medium">사유</th>
                    <th className="p-3 text-left text-sm font-medium">상태</th>
                    <th className="p-3 text-left text-sm font-medium">신고수</th>
                    <th className="p-3 text-left text-sm font-medium">제목</th>
                    <th className="p-3 text-left text-sm font-medium">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {postData?.items?.map((r: any) => (
                  <ReportRow key={r.id} r={r} type="post" onDismiss={handleDismiss} onAction={setActionReport} />
                ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!actionReport} onOpenChange={() => setActionReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>조치 (콘텐츠 삭제)</AlertDialogTitle>
            <AlertDialogDescription>
              해당 콘텐츠를 삭제합니다. 사유를 입력하세요 (선택).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="조치 사유"
            className="w-full border rounded p-2 min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>조치</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
