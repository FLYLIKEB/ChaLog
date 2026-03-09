import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loader2, Trash2, Pin, PinOff } from 'lucide-react';
import { toast } from 'sonner';

export function AdminPosts() {
  const { id } = useParams();
  const postId = id ? Number(id) : null;
  const [list, setList] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPosts({ search: debouncedSearch || undefined, limit: 50 }).then(setList).finally(() => setLoading(false));
  }, [debouncedSearch]);

  useEffect(() => {
    if (postId) {
      adminApi.getPostDetail(postId).then(setDetail);
      adminApi.getPostComments(postId).then(setComments);
    } else {
      setDetail(null);
      setComments([]);
    }
  }, [postId]);

  const handleDelete = async (id: number) => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      await adminApi.deletePost(id);
      toast.success('삭제했습니다.');
      setDetail(null);
      adminApi.getPosts({ search: debouncedSearch || undefined, limit: 50 }).then(setList);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleTogglePin = async (id: number) => {
    try {
      const res = await adminApi.togglePostPin(id);
      toast.success(res.isPinned ? '공지로 고정했습니다.' : '공지 고정을 해제했습니다.');
      if (postId === id) {
        setDetail((d: any) => (d ? { ...d, isPinned: res.isPinned } : d));
      }
      adminApi.getPosts({ search: debouncedSearch || undefined, limit: 50 }).then(setList);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return;
    try {
      await adminApi.deleteComment(commentId);
      toast.success('삭제했습니다.');
      if (postId) adminApi.getPostComments(postId).then(setComments);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  if (detail) {
    return (
      <div className="space-y-6">
        <Link to="/admin/posts" className="text-primary text-sm">← 목록으로</Link>
        <h1 className="text-2xl font-bold text-foreground">게시글 상세</h1>
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <p><strong>제목:</strong> {detail.title}</p>
          <p><strong>작성자:</strong> {detail.user?.name} (ID: {detail.user?.id})</p>
          <p><strong>조회:</strong> {detail.viewCount ?? 0} · <strong>댓글:</strong> {detail.commentCount ?? comments.length} · <strong>공지:</strong> {detail.isPinned ? '예' : '아니오'}</p>
          <p><strong>본문:</strong></p>
          <pre className="whitespace-pre-wrap text-sm bg-muted rounded-lg p-3">{detail.content}</pre>
          <div className="flex gap-2 flex-wrap">
            <Link to={`/chadam/${detail.id}`} target="_blank" className="text-primary text-sm">원문 보기</Link>
            <Button variant="outline" size="sm" onClick={() => handleTogglePin(detail.id)}>
              {detail.isPinned ? <PinOff className="w-4 h-4 mr-1" /> : <Pin className="w-4 h-4 mr-1" />}
              {detail.isPinned ? '공지 해제' : '공지 고정'}
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(detail.id)}>
              <Trash2 className="w-4 h-4 mr-1" /> 게시글 삭제
            </Button>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="font-semibold mb-3">댓글 ({comments.length})</h2>
          {comments.length ? (
            <ul className="space-y-3">
              {comments.map((c: any) => (
                <li key={c.id} className="border-b pb-3 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-medium">{c.user?.name ?? '알 수 없음'}</span>
                      <span className="text-muted-foreground text-xs ml-2">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                      <p className="text-sm mt-1">{c.content}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteComment(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">댓글 없음</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">게시글 관리</h1>
      <Input
        placeholder="제목/본문/작성자 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">ID</th>
                <th className="p-3 text-left text-sm font-medium">제목</th>
                <th className="p-3 text-left text-sm font-medium">작성자</th>
                <th className="p-3 text-left text-sm font-medium">조회</th>
                <th className="p-3 text-left text-sm font-medium">작성일</th>
                <th className="p-3 text-left text-sm font-medium">공지</th>
                <th className="p-3 text-left text-sm font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {list?.items?.map((p: any) => (
                <tr key={p.id} className="border-b">
                  <td className="p-3 text-sm">{p.id}</td>
                  <td className="p-3 text-sm max-w-[200px] truncate">{p.title || '-'}</td>
                  <td className="p-3 text-sm">{p.user?.name || '-'}</td>
                  <td className="p-3 text-sm">{p.viewCount ?? 0}</td>
                  <td className="p-3 text-sm">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-sm">{p.isPinned ? '✓' : '-'}</td>
                  <td className="p-3">
                    <Link to={`/admin/posts/${p.id}`} className="text-primary text-sm mr-2">상세</Link>
                    <Link to={`/chadam/${p.id}`} target="_blank" className="text-primary text-sm mr-2">원문</Link>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
