import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loader2, Ban, Shield } from 'lucide-react';
import { toast } from 'sonner';

export function AdminUsers() {
  const { id } = useParams();
  const userId = id;
  const [list, setList] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUsers({ search: search || undefined, limit: 50 }).then(setList).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    if (userId) {
      adminApi.getUserDetail(Number(userId)).then(setDetail);
    } else {
      setDetail(null);
    }
  }, [userId]);

  const handleSuspend = async (id: number) => {
    try {
      await adminApi.suspendUser(id);
      toast.success('계정을 정지했습니다.');
      if (Number(userId) === id) setDetail(null);
      adminApi.getUsers({ search: search || undefined }).then(setList);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handlePromote = async (id: number) => {
    try {
      await adminApi.promoteUser(id);
      toast.success('운영자로 승격했습니다.');
      if (Number(userId) === id) adminApi.getUserDetail(id).then(setDetail);
      adminApi.getUsers({ search: search || undefined }).then(setList);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  if (detail) {
    return (
      <div className="space-y-6">
        <Link to="/admin/users" className="text-primary text-sm">← 목록으로</Link>
        <h1 className="text-2xl font-bold">사용자 상세</h1>
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <p><strong>ID:</strong> {detail.id}</p>
          <p><strong>이름:</strong> {detail.name}</p>
          <p><strong>이메일:</strong> {detail.email || '-'}</p>
          <p><strong>차록:</strong> {detail.noteCount} · <strong>게시글:</strong> {detail.postCount}</p>
          <p><strong>팔로워:</strong> {detail.followerCount} · <strong>팔로잉:</strong> {detail.followingCount}</p>
          <p><strong>가입일:</strong> {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : '-'}</p>
          {detail.bannedAt && <p className="text-red-600">정지됨: {new Date(detail.bannedAt).toLocaleString()}</p>}
          <div className="flex gap-2">
            {!detail.bannedAt && detail.role !== 'admin' && (
              <Button variant="destructive" onClick={() => handleSuspend(detail.id)}>
                <Ban className="w-4 h-4 mr-1" /> 계정 정지
              </Button>
            )}
            {detail.role !== 'admin' && (
              <Button variant="outline" onClick={() => handlePromote(detail.id)}>
                <Shield className="w-4 h-4 mr-1" /> 운영자 승격
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">사용자 관리</h1>
      <Input
        placeholder="이름 검색"
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
                <th className="p-3 text-left text-sm font-medium">이름</th>
                <th className="p-3 text-left text-sm font-medium">차록</th>
                <th className="p-3 text-left text-sm font-medium">게시글</th>
                <th className="p-3 text-left text-sm font-medium">가입일</th>
                <th className="p-3 text-left text-sm font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {list?.items?.map((u: any) => (
                <tr key={u.id} className="border-b">
                  <td className="p-3 text-sm">{u.id}</td>
                  <td className="p-3 text-sm">{u.name}</td>
                  <td className="p-3 text-sm">{u.noteCount}</td>
                  <td className="p-3 text-sm">{u.postCount}</td>
                  <td className="p-3 text-sm">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="p-3">
                    <Link to={`/admin/users/${u.id}`} className="text-primary text-sm">상세</Link>
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
