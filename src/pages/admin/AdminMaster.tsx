import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loader2, Trash2, Pencil, Merge } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'teas' | 'sellers' | 'tags';

export function AdminMaster() {
  const [tab, setTab] = useState<Tab>('teas');
  const [teas, setTeas] = useState<any>(null);
  const [sellers, setSellers] = useState<any>(null);
  const [tags, setTags] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ type: string; id: number; name?: string } | null>(null);
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    if (tab === 'teas') {
      adminApi.getTeas({ search: search || undefined, limit: 50 }).then(setTeas).finally(() => setLoading(false));
    } else if (tab === 'sellers') {
      adminApi.getSellers({ search: search || undefined, limit: 50 }).then(setSellers).finally(() => setLoading(false));
    } else {
      adminApi.getTags({ search: search || undefined, limit: 50, sortBy: 'usageCount' }).then(setTags).finally(() => setLoading(false));
    }
  }, [tab, search]);

  const handleUpdateTea = async (id: number, dto: Record<string, unknown>) => {
    try {
      await adminApi.updateTea(id, dto);
      toast.success('수정했습니다.');
      setEditing(null);
      adminApi.getTeas({ search: search || undefined }).then(setTeas);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleDeleteTea = async (id: number) => {
    if (!confirm('이 차를 삭제하시겠습니까?')) return;
    try {
      await adminApi.deleteTea(id);
      toast.success('삭제했습니다.');
      adminApi.getTeas({ search: search || undefined }).then(setTeas);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleUpdateSeller = async (id: number, dto: Record<string, unknown>) => {
    try {
      await adminApi.updateSeller(id, dto);
      toast.success('수정했습니다.');
      setEditing(null);
      adminApi.getSellers({ search: search || undefined }).then(setSellers);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleDeleteSeller = async (id: number) => {
    if (!confirm('이 찻집을 삭제하시겠습니까?')) return;
    try {
      await adminApi.deleteSeller(id);
      toast.success('삭제했습니다.');
      adminApi.getSellers({ search: search || undefined }).then(setSellers);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleUpdateTag = async (id: number, name: string) => {
    try {
      await adminApi.updateTag(id, { name });
      toast.success('수정했습니다.');
      setEditing(null);
      adminApi.getTags({ search: search || undefined }).then(setTags);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm('이 태그를 삭제하시겠습니까?')) return;
    try {
      await adminApi.deleteTag(id);
      toast.success('삭제했습니다.');
      adminApi.getTags({ search: search || undefined }).then(setTags);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const handleMergeTag = async (sourceId: number, targetId: number) => {
    try {
      await adminApi.mergeTag(sourceId, targetId);
      toast.success('병합했습니다.');
      setMergeTarget(null);
      adminApi.getTags({ search: search || undefined }).then(setTags);
    } catch (e: any) {
      toast.error(e?.message || '실패');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'teas', label: '차(Tea)' },
    { key: 'sellers', label: '찻집(Seller)' },
    { key: 'tags', label: '태그(Tag)' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">마스터 데이터</h1>
      <div className="flex gap-2 border-b">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 font-medium ${tab === key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Input
        placeholder="검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {tab === 'teas' && (
        loading ? <Loader2 className="w-8 h-8 animate-spin" /> : (
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-3 text-left text-sm font-medium">ID</th>
                  <th className="p-3 text-left text-sm font-medium">이름</th>
                  <th className="p-3 text-left text-sm font-medium">종류</th>
                  <th className="p-3 text-left text-sm font-medium">판매처</th>
                  <th className="p-3 text-left text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {teas?.items?.map((t: any) => (
                  <tr key={t.id} className="border-b">
                    <td className="p-3 text-sm">{t.id}</td>
                    <td className="p-3 text-sm">{t.name}</td>
                    <td className="p-3 text-sm">{t.type}</td>
                    <td className="p-3 text-sm">{t.seller || '-'}</td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteTea(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'sellers' && (
        loading ? <Loader2 className="w-8 h-8 animate-spin" /> : (
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-3 text-left text-sm font-medium">ID</th>
                  <th className="p-3 text-left text-sm font-medium">이름</th>
                  <th className="p-3 text-left text-sm font-medium">차 수</th>
                  <th className="p-3 text-left text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sellers?.items?.map((s: any) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-3 text-sm">{s.id}</td>
                    <td className="p-3 text-sm">{s.name}</td>
                    <td className="p-3 text-sm">{s.teaCount ?? 0}</td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteSeller(s.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'tags' && (
        loading ? <Loader2 className="w-8 h-8 animate-spin" /> : (
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-3 text-left text-sm font-medium">ID</th>
                  <th className="p-3 text-left text-sm font-medium">이름</th>
                  <th className="p-3 text-left text-sm font-medium">사용 수</th>
                  <th className="p-3 text-left text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {tags?.items?.map((t: any) => (
                  <tr key={t.id} className="border-b">
                    <td className="p-3 text-sm">{t.id}</td>
                    <td className="p-3 text-sm">
                      {editing?.type === 'tag' && editing?.id === t.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const name = (e.currentTarget.elements.namedItem('name') as HTMLInputElement)?.value?.trim();
                            if (name) handleUpdateTag(t.id, name);
                          }}
                          className="flex gap-2"
                        >
                          <Input name="name" defaultValue={t.name} className="w-40" />
                          <Button size="sm" type="submit">저장</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>취소</Button>
                        </form>
                      ) : (
                        t.name
                      )}
                    </td>
                    <td className="p-3 text-sm">{t.usageCount ?? 0}</td>
                    <td className="p-3 flex gap-1">
                      {!(editing?.type === 'tag' && editing?.id === t.id) && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ type: 'tag', id: t.id, name: t.name })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {mergeTarget === null ? (
                            <Button size="sm" variant="ghost" onClick={() => setMergeTarget(t.id)} title="다른 태그로 병합">
                              <Merge className="w-4 h-4" />
                            </Button>
                          ) : mergeTarget === t.id ? (
                            <Button size="sm" variant="ghost" onClick={() => setMergeTarget(null)}>취소</Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleMergeTag(mergeTarget, t.id)}>
                              여기로 병합
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteTag(t.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
