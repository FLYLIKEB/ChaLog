import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function AdminPosts() {
  const [list, setList] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPosts({ search: search || undefined, limit: 50 }).then(setList).finally(() => setLoading(false));
  }, [search]);

  const handleDelete = async (id: number) => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      await adminApi.deletePost(id);
      toast.success('삭제했습니다.');
      adminApi.getPosts({ search: search || undefined }).then(setList);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">게시글 관리</h1>
      <Input
        placeholder="제목/본문/작성자 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-3 text-left text-sm font-medium">ID</th>
                <th className="p-3 text-left text-sm font-medium">제목</th>
                <th className="p-3 text-left text-sm font-medium">작성자</th>
                <th className="p-3 text-left text-sm font-medium">조회</th>
                <th className="p-3 text-left text-sm font-medium">작성일</th>
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
                  <td className="p-3">
                    <Link to={`/chadam/${p.id}`} target="_blank" className="text-primary text-sm mr-2">보기</Link>
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
