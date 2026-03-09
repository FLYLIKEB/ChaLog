import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
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
import { Loader2, Trash2, Pencil, Merge, Plus } from 'lucide-react';
import { toast } from 'sonner';

const TEA_TYPES = ['녹차', '홍차', '우롱차', '백차', '흑차', '대용차', '황차', '보이차'];

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
  const [createOpen, setCreateOpen] = useState<{ tea: boolean; seller: boolean; tag: boolean }>({
    tea: false,
    seller: false,
    tag: false,
  });
  const [newTagName, setNewTagName] = useState('');

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

  const handleCreateTea = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem('teaName') as HTMLInputElement)?.value?.trim();
    const yearStr = (form.elements.namedItem('teaYear') as HTMLInputElement)?.value?.trim();
    const type = (form.elements.namedItem('teaType') as HTMLSelectElement)?.value;
    const seller = (form.elements.namedItem('teaSeller') as HTMLInputElement)?.value?.trim();
    const origin = (form.elements.namedItem('teaOrigin') as HTMLInputElement)?.value?.trim();
    const priceStr = (form.elements.namedItem('teaPrice') as HTMLInputElement)?.value?.trim();
    if (!name || !type) {
      toast.error('이름과 종류는 필수입니다.');
      return;
    }
    try {
      await adminApi.createTea({
        name,
        year: yearStr ? parseInt(yearStr, 10) : undefined,
        type,
        seller: seller || undefined,
        origin: origin || undefined,
        price: priceStr ? parseInt(priceStr, 10) : undefined,
      });
      toast.success('추가했습니다.');
      setCreateOpen((o) => ({ ...o, tea: false }));
      adminApi.getTeas({ search: search || undefined, limit: 50 }).then(setTeas);
    } catch (err: any) {
      toast.error(err?.message || '실패');
    }
  };

  const handleCreateSeller = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem('sellerName') as HTMLInputElement)?.value?.trim();
    if (!name) {
      toast.error('이름은 필수입니다.');
      return;
    }
    try {
      await adminApi.createSeller({
        name,
        address: (form.elements.namedItem('sellerAddress') as HTMLInputElement)?.value?.trim() || undefined,
        mapUrl: (form.elements.namedItem('sellerMapUrl') as HTMLInputElement)?.value?.trim() || undefined,
        websiteUrl: (form.elements.namedItem('sellerWebsiteUrl') as HTMLInputElement)?.value?.trim() || undefined,
        phone: (form.elements.namedItem('sellerPhone') as HTMLInputElement)?.value?.trim() || undefined,
        description: (form.elements.namedItem('sellerDescription') as HTMLInputElement)?.value?.trim() || undefined,
        businessHours: (form.elements.namedItem('sellerBusinessHours') as HTMLInputElement)?.value?.trim() || undefined,
      });
      toast.success('추가했습니다.');
      setCreateOpen((o) => ({ ...o, seller: false }));
      adminApi.getSellers({ search: search || undefined, limit: 50 }).then(setSellers);
    } catch (err: any) {
      toast.error(err?.message || '실패');
    }
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) {
      toast.error('태그 이름을 입력해주세요.');
      return;
    }
    try {
      await adminApi.createTag({ name });
      toast.success('추가했습니다.');
      setNewTagName('');
      setCreateOpen((o) => ({ ...o, tag: false }));
      adminApi.getTags({ search: search || undefined, limit: 50, sortBy: 'usageCount' }).then(setTags);
    } catch (err: any) {
      toast.error(err?.message || '실패');
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
      <div className="flex gap-2 items-center">
        <Input
          placeholder="검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {tab === 'teas' && (
          <Button size="sm" onClick={() => setCreateOpen((o) => ({ ...o, tea: true }))}>
            <Plus className="w-4 h-4 mr-1" /> 추가
          </Button>
        )}
        {tab === 'sellers' && (
          <Button size="sm" onClick={() => setCreateOpen((o) => ({ ...o, seller: true }))}>
            <Plus className="w-4 h-4 mr-1" /> 추가
          </Button>
        )}
        {tab === 'tags' && (
          <Button size="sm" onClick={() => setCreateOpen((o) => ({ ...o, tag: true }))}>
            <Plus className="w-4 h-4 mr-1" /> 추가
          </Button>
        )}
      </div>

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
                    <td className="p-3 text-sm">
                      {editing?.type === 'tea' && editing?.id === t.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const name = (e.currentTarget.elements.namedItem('teaEditName') as HTMLInputElement)?.value?.trim();
                            const yearStr = (e.currentTarget.elements.namedItem('teaEditYear') as HTMLInputElement)?.value?.trim();
                            const type = (e.currentTarget.elements.namedItem('teaEditType') as HTMLSelectElement)?.value;
                            const seller = (e.currentTarget.elements.namedItem('teaEditSeller') as HTMLInputElement)?.value?.trim();
                            if (name && type) handleUpdateTea(t.id, { name, year: yearStr ? parseInt(yearStr, 10) : undefined, type, seller: seller || undefined });
                          }}
                          className="flex flex-wrap gap-2 items-center"
                        >
                          <Input name="teaEditName" defaultValue={t.name} className="w-28" placeholder="이름" />
                          <Input name="teaEditYear" defaultValue={t.year ?? ''} placeholder="연도" className="w-16" type="number" />
                          <select name="teaEditType" defaultValue={t.type} className="border rounded px-2 py-1 text-sm bg-background">
                            {TEA_TYPES.map((ty) => (
                              <option key={ty} value={ty}>{ty}</option>
                            ))}
                          </select>
                          <Input name="teaEditSeller" defaultValue={t.seller ?? ''} placeholder="판매처" className="w-24" />
                          <Button size="sm" type="submit">저장</Button>
                          <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(null)}>취소</Button>
                        </form>
                      ) : (
                        t.name
                      )}
                    </td>
                    <td className="p-3 text-sm">{t.type}</td>
                    <td className="p-3 text-sm">{t.seller || '-'}</td>
                    <td className="p-3 flex gap-1">
                      {!(editing?.type === 'tea' && editing?.id === t.id) && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ type: 'tea', id: t.id })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteTea(t.id)}>
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
                    <td className="p-3 text-sm">
                      {editing?.type === 'seller' && editing?.id === s.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const address = (e.currentTarget.elements.namedItem('sellerEditAddress') as HTMLInputElement)?.value?.trim();
                            handleUpdateSeller(s.id, { address: address || undefined });
                          }}
                          className="flex gap-2 items-center"
                        >
                          <Input name="sellerEditAddress" defaultValue={s.address ?? ''} placeholder="주소" className="w-48" />
                          <Button size="sm" type="submit">저장</Button>
                          <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(null)}>취소</Button>
                        </form>
                      ) : (
                        s.name
                      )}
                    </td>
                    <td className="p-3 text-sm">{s.teaCount ?? 0}</td>
                    <td className="p-3 flex gap-1">
                      {!(editing?.type === 'seller' && editing?.id === s.id) && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ type: 'seller', id: s.id })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteSeller(s.id)}>
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

      {/* Create Tea Modal */}
      <Dialog open={createOpen.tea} onOpenChange={(open) => setCreateOpen((o) => ({ ...o, tea: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>차 추가</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTea} className="space-y-4">
            <div>
              <Label>이름 *</Label>
              <Input name="teaName" required placeholder="차 이름" />
            </div>
            <div>
              <Label>연도</Label>
              <Input name="teaYear" type="number" placeholder="2024" />
            </div>
            <div>
              <Label>종류 *</Label>
              <select name="teaType" required className="w-full border rounded px-3 py-2 bg-background">
                <option value="">선택</option>
                {TEA_TYPES.map((ty) => (
                  <option key={ty} value={ty}>{ty}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>판매처</Label>
              <Input name="teaSeller" placeholder="찻집 이름" />
            </div>
            <div>
              <Label>원산지</Label>
              <Input name="teaOrigin" placeholder="중국 푸젠" />
            </div>
            <div>
              <Label>가격</Label>
              <Input name="teaPrice" type="number" placeholder="0" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen((o) => ({ ...o, tea: false }))}>취소</Button>
              <Button type="submit">추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Seller Modal */}
      <Dialog open={createOpen.seller} onOpenChange={(open) => setCreateOpen((o) => ({ ...o, seller: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>찻집 추가</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSeller} className="space-y-4">
            <div>
              <Label>이름 *</Label>
              <Input name="sellerName" required placeholder="찻집 이름" />
            </div>
            <div>
              <Label>주소</Label>
              <Input name="sellerAddress" placeholder="주소" />
            </div>
            <div>
              <Label>지도 URL</Label>
              <Input name="sellerMapUrl" placeholder="https://..." />
            </div>
            <div>
              <Label>웹사이트</Label>
              <Input name="sellerWebsiteUrl" placeholder="https://..." />
            </div>
            <div>
              <Label>전화</Label>
              <Input name="sellerPhone" placeholder="전화번호" />
            </div>
            <div>
              <Label>영업시간</Label>
              <Input name="sellerBusinessHours" placeholder="09:00-18:00" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen((o) => ({ ...o, seller: false }))}>취소</Button>
              <Button type="submit">추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Tag Modal */}
      <Dialog open={createOpen.tag} onOpenChange={(open) => setCreateOpen((o) => ({ ...o, tag: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>태그 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>이름 *</Label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="태그 이름"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen((o) => ({ ...o, tag: false }))}>취소</Button>
              <Button onClick={handleCreateTag}>추가</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
