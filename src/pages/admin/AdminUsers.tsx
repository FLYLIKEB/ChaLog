import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Loader2, Ban, Shield, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export function AdminUsers() {
  const { id: userId } = useParams();
  const [list, setList] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    adminApi.getUsers({ search: debouncedSearch || undefined, limit: 50 }).then(setList).finally(() => setLoading(false));
  }, [debouncedSearch]);

  useEffect(() => {
    if (userId) {
      setDetailLoading(true);
      adminApi.getUserDetail(Number(userId)).then(setDetail).finally(() => setDetailLoading(false));
    } else {
      setDetail(null);
    }
  }, [userId]);

  const handleSuspend = async (id: number) => {
    try {
      await adminApi.suspendUser(id);
      toast.success('계정을 정지했습니다.');
      if (Number(userId) === id) setDetail(null);
      adminApi.getUsers({ search: debouncedSearch || undefined, limit: 50 }).then(setList);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handlePromote = async (id: number) => {
    try {
      await adminApi.promoteUser(id);
      toast.success('운영자로 승격했습니다.');
      if (Number(userId) === id) adminApi.getUserDetail(id).then(setDetail);
      adminApi.getUsers({ search: debouncedSearch || undefined, limit: 50 }).then(setList);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 사용자를 완전히 삭제하시겠습니까? 연관 데이터가 모두 삭제됩니다.')) return;
    try {
      await adminApi.deleteUser(id);
      toast.success('삭제했습니다.');
      setDetail(null);
      adminApi.getUsers({ search: debouncedSearch || undefined, limit: 50 }).then(setList);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!detail) return;
    const form = e.currentTarget;
    const name = (form.elements.namedItem('editName') as HTMLInputElement)?.value?.trim();
    const bio = (form.elements.namedItem('editBio') as HTMLInputElement)?.value?.trim();
    const instagramUrl = (form.elements.namedItem('editInstagramUrl') as HTMLInputElement)?.value?.trim();
    const blogUrl = (form.elements.namedItem('editBlogUrl') as HTMLInputElement)?.value?.trim();
    try {
      await adminApi.updateUser(detail.id, {
        name: name || undefined,
        bio: bio || null,
        instagramUrl: instagramUrl || null,
        blogUrl: blogUrl || null,
      });
      toast.success('프로필을 수정했습니다.');
      setEditOpen(false);
      adminApi.getUserDetail(detail.id).then(setDetail);
      adminApi.getUsers({ search: debouncedSearch || undefined, limit: 50 }).then(setList);
    } catch (err: any) {
      toast.error(err?.message || '실패');
    }
  };

  if (detailLoading) {
    return (
      <div className="space-y-6">
        <Link to="/admin/users" className="text-primary text-sm">← 목록으로</Link>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">사용자 상세</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (detail) {
    return (
      <div className="space-y-6">
        <Link to="/admin/users" className="text-primary text-sm">← 목록으로</Link>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">사용자 상세</h1>
        <div className="bg-card rounded-lg border border-border p-4 md:p-6 space-y-4">
          <p><strong>ID:</strong> {detail.id}</p>
          <p><strong>이름:</strong> {detail.name}</p>
          <p><strong>이메일:</strong> {detail.email || '-'}</p>
          <p><strong>차록:</strong> {detail.noteCount} · <strong>게시글:</strong> {detail.postCount}</p>
          <p><strong>팔로워:</strong> {detail.followerCount} · <strong>팔로잉:</strong> {detail.followingCount}</p>
          <p><strong>가입일:</strong> {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : '-'}</p>
          {detail.bannedAt && <p className="text-destructive">정지됨: {new Date(detail.bannedAt).toLocaleString()}</p>}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-1" /> 프로필 수정
            </Button>
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
            {detail.role !== 'admin' && (
              <Button variant="destructive" onClick={() => handleDelete(detail.id)}>
                <Trash2 className="w-4 h-4 mr-1" /> 계정 삭제
              </Button>
            )}
          </div>
        </div>
        {detail.recentNotes?.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-2">최근 차록</h2>
            <ul className="space-y-1 text-sm">
              {detail.recentNotes.map((n: any) => (
                <li key={n.id}><Link to={`/note/${n.id}`} target="_blank" className="text-primary">{n.tea?.name} - {n.memo?.slice(0, 40) || '-'}</Link></li>
              ))}
            </ul>
          </div>
        )}
        {detail.recentPosts?.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-2">최근 게시글</h2>
            <ul className="space-y-1 text-sm">
              {detail.recentPosts.map((p: any) => (
                <li key={p.id}><Link to={`/chadam/${p.id}`} target="_blank" className="text-primary">{p.title}</Link></li>
              ))}
            </ul>
          </div>
        )}
        {(detail.reportsAsReporter?.noteReports?.length > 0 || detail.reportsAsReporter?.postReports?.length > 0) && (
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-2">이 사용자가 신고한 건</h2>
            <ul className="space-y-1 text-sm">
              {detail.reportsAsReporter.noteReports?.map((r: any) => (
                <li key={r.id}>차록 #{r.noteId} - {r.reason} ({r.status})</li>
              ))}
              {detail.reportsAsReporter.postReports?.map((r: any) => (
                <li key={r.id}>게시글 #{r.postId} - {r.reason} ({r.status})</li>
              ))}
            </ul>
          </div>
        )}
        {(detail.reportsAgainstUser?.noteReports?.length > 0 || detail.reportsAgainstUser?.postReports?.length > 0) && (
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-2">이 사용자 콘텐츠 신고 이력</h2>
            <ul className="space-y-1 text-sm">
              {detail.reportsAgainstUser.noteReports?.map((r: any) => (
                <li key={r.id}>차록 #{r.noteId} - {r.reason} ({r.status})</li>
              ))}
              {detail.reportsAgainstUser.postReports?.map((r: any) => (
                <li key={r.id}>게시글 #{r.postId} - {r.reason} ({r.status})</li>
              ))}
            </ul>
          </div>
        )}

        {/* 프로필 수정 모달 */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>프로필 수정</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label>이름</Label>
                <Input name="editName" defaultValue={detail.name} placeholder="이름" />
              </div>
              <div>
                <Label>소개 (bio)</Label>
                <Input name="editBio" defaultValue={detail.bio ?? ''} placeholder="소개" />
              </div>
              <div>
                <Label>인스타그램 URL</Label>
                <Input name="editInstagramUrl" defaultValue={detail.instagramUrl ?? ''} placeholder="https://..." />
              </div>
              <div>
                <Label>블로그 URL</Label>
                <Input name="editBlogUrl" defaultValue={detail.blogUrl ?? ''} placeholder="https://..." />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>취소</Button>
                <Button type="submit">저장</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">사용자 관리</h1>
      <Input
        placeholder="이름 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xs"
      />
      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
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
