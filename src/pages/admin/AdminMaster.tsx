import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Loader2, Trash2, Pencil, Merge, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { TEA_TYPES, COMMON_PRICES, COMMON_WEIGHTS, formatPriceToKorean } from '../../constants';

type Tab = 'teas' | 'sellers' | 'tags' | 'users';

export function AdminMaster() {
  const [tab, setTab] = useState<Tab>('teas');
  const [teas, setTeas] = useState<any>(null);
  const [sellers, setSellers] = useState<any>(null);
  const [tags, setTags] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ type: string; id: number; name?: string } | null>(null);
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState<{ tea: boolean; seller: boolean; tag: boolean }>({
    tea: false,
    seller: false,
    tag: false,
  });
  const [creating, setCreating] = useState({ tea: false, seller: false, tag: false });
  const [newTagName, setNewTagName] = useState('');
  const [detailOpen, setDetailOpen] = useState<{ type: 'tea' | 'seller' | 'tag'; id: number } | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ total: number; success: number; skipped: number; errors: { row: number; message: string }[] } | null>(null);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawlNameSel, setCrawlNameSel] = useState('');
  const [crawlTypeSel, setCrawlTypeSel] = useState('');
  const [crawlPriceSel, setCrawlPriceSel] = useState('');
  const [crawlPreviewing, setCrawlPreviewing] = useState(false);
  const [crawlItems, setCrawlItems] = useState<{ name: string; type: string; price?: number; selected: boolean }[]>([]);
  const [crawlRegistering, setCrawlRegistering] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!detailOpen) return;
    setDetailLoading(true);
    setDetailData(null);
    if (detailOpen.type === 'tea') {
      adminApi.getTeaDetail(detailOpen.id).then(setDetailData).finally(() => setDetailLoading(false));
    } else if (detailOpen.type === 'seller') {
      adminApi.getSellerDetail(detailOpen.id).then(setDetailData).finally(() => setDetailLoading(false));
    } else {
      adminApi.getTagDetail(detailOpen.id).then(setDetailData).finally(() => setDetailLoading(false));
    }
  }, [detailOpen]);

  useEffect(() => {
    setLoading(true);
    const id = ++requestIdRef.current;
    const opts = { search: search || undefined, limit: 50 };
    if (tab === 'teas') {
      adminApi.getTeas(opts).then((r) => { if (id === requestIdRef.current) setTeas(r); }).finally(() => { if (id === requestIdRef.current) setLoading(false); });
    } else if (tab === 'sellers') {
      adminApi.getSellers(opts).then((r) => { if (id === requestIdRef.current) setSellers(r); }).finally(() => { if (id === requestIdRef.current) setLoading(false); });
    } else if (tab === 'tags') {
      adminApi.getTags({ ...opts, sortBy: 'usageCount' }).then((r) => { if (id === requestIdRef.current) setTags(r); }).finally(() => { if (id === requestIdRef.current) setLoading(false); });
    } else {
      adminApi.getUsers(opts).then((r) => { if (id === requestIdRef.current) setUsers(r); }).finally(() => { if (id === requestIdRef.current) setLoading(false); });
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

  const handleSaveDetail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!detailOpen || !detailData || detailSaving) return;
    const form = e.currentTarget;
    try {
      setDetailSaving(true);
      if (detailOpen.type === 'tea') {
        const dto: Record<string, unknown> = {
          name: (form.elements.namedItem('dtName') as HTMLInputElement)?.value?.trim(),
          year: (() => {
            const v = (form.elements.namedItem('dtYear') as HTMLInputElement)?.value?.trim();
            return v === '' ? null : parseInt(v, 10);
          })(),
          type: (form.elements.namedItem('dtType') as HTMLSelectElement)?.value,
          seller: (form.elements.namedItem('dtSeller') as HTMLInputElement)?.value?.trim() || null,
          origin: (form.elements.namedItem('dtOrigin') as HTMLInputElement)?.value?.trim() || null,
          price: (() => {
            const v = (form.elements.namedItem('dtPrice') as HTMLInputElement)?.value?.trim();
            return v === '' ? null : parseInt(v, 10);
          })(),
          weight: (() => {
            const v = (form.elements.namedItem('dtWeight') as HTMLInputElement)?.value?.trim();
            return v === '' ? null : parseInt(v, 10);
          })(),
        };
        await adminApi.updateTea(detailOpen.id, dto);
        adminApi.getTeas({ search: search || undefined }).then(setTeas);
      } else if (detailOpen.type === 'seller') {
        const dto: Record<string, unknown> = {
          name: (form.elements.namedItem('dtName') as HTMLInputElement)?.value?.trim(),
          address: (form.elements.namedItem('dtAddress') as HTMLInputElement)?.value?.trim() || null,
          mapUrl: (form.elements.namedItem('dtMapUrl') as HTMLInputElement)?.value?.trim() || null,
          websiteUrl: (form.elements.namedItem('dtWebsiteUrl') as HTMLInputElement)?.value?.trim() || null,
          phone: (form.elements.namedItem('dtPhone') as HTMLInputElement)?.value?.trim() || null,
          description: (form.elements.namedItem('dtDescription') as HTMLTextAreaElement)?.value?.trim() || null,
          businessHours: (form.elements.namedItem('dtBusinessHours') as HTMLInputElement)?.value?.trim() || null,
        };
        await adminApi.updateSeller(detailOpen.id, dto);
        adminApi.getSellers({ search: search || undefined }).then(setSellers);
      } else {
        const name = (form.elements.namedItem('dtName') as HTMLInputElement)?.value?.trim();
        if (name) {
          await adminApi.updateTag(detailOpen.id, { name });
          adminApi.getTags({ search: search || undefined }).then(setTags);
        }
      }
      toast.success('수정했습니다.');
      setDetailOpen(null);
    } catch (err: any) {
      toast.error(err?.message || '실패');
    } finally {
      setDetailSaving(false);
    }
  };

  const handleCreateTea = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (creating.tea) return;
    const form = e.currentTarget;
    const name = (form.elements.namedItem('teaName') as HTMLInputElement)?.value?.trim();
    const yearStr = (form.elements.namedItem('teaYear') as HTMLInputElement)?.value?.trim();
    const type = (form.elements.namedItem('teaType') as HTMLSelectElement)?.value;
    const seller = (form.elements.namedItem('teaSeller') as HTMLInputElement)?.value?.trim();
    const origin = (form.elements.namedItem('teaOrigin') as HTMLInputElement)?.value?.trim();
    const priceStr = (form.elements.namedItem('teaPrice') as HTMLInputElement)?.value?.trim();
    const weightStr = (form.elements.namedItem('teaWeight') as HTMLInputElement)?.value?.trim();
    if (!name || !type) {
      toast.error('이름과 종류는 필수입니다.');
      return;
    }
    try {
      setCreating((s) => ({ ...s, tea: true }));
      await adminApi.createTea({
        name,
        year: yearStr ? parseInt(yearStr, 10) : undefined,
        type,
        seller: seller || undefined,
        origin: origin || undefined,
        price: priceStr ? parseInt(priceStr, 10) : undefined,
        weight: weightStr ? parseInt(weightStr, 10) : undefined,
      });
      toast.success('추가했습니다.');
      setCreateOpen((o) => ({ ...o, tea: false }));
      adminApi.getTeas({ search: search || undefined, limit: 50 }).then(setTeas);
    } catch (err: any) {
      toast.error(err?.message || '실패');
    } finally {
      setCreating((s) => ({ ...s, tea: false }));
    }
  };

  const handleCreateSeller = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (creating.seller) return;
    const form = e.currentTarget;
    const name = (form.elements.namedItem('sellerName') as HTMLInputElement)?.value?.trim();
    if (!name) {
      toast.error('이름은 필수입니다.');
      return;
    }
    try {
      setCreating((s) => ({ ...s, seller: true }));
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
    } finally {
      setCreating((s) => ({ ...s, seller: false }));
    }
  };

  const handleCreateTag = async () => {
    if (creating.tag) return;
    const name = newTagName.trim();
    if (!name) {
      toast.error('태그 이름을 입력해주세요.');
      return;
    }
    try {
      setCreating((s) => ({ ...s, tag: true }));
      await adminApi.createTag({ name });
      toast.success('추가했습니다.');
      setNewTagName('');
      setCreateOpen((o) => ({ ...o, tag: false }));
      adminApi.getTags({ search: search || undefined, limit: 50, sortBy: 'usageCount' }).then(setTags);
    } catch (err: any) {
      toast.error(err?.message || '실패');
    } finally {
      setCreating((s) => ({ ...s, tag: false }));
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'teas', label: '차(Tea)' },
    { key: 'sellers', label: '찻집(Seller)' },
    { key: 'tags', label: '태그(Tag)' },
    { key: 'users', label: '사용자(User)' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">마스터 데이터</h1>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 border-b min-w-0">
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
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
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

      {tab === 'users' && (
        loading ? <Loader2 className="w-8 h-8 animate-spin" /> : (
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
                {users?.items?.map((u: any) => (
                  <tr key={u.id} className="border-b">
                    <td className="p-3 text-sm">{u.id}</td>
                    <td className="p-3 text-sm">{u.name}</td>
                    <td className="p-3 text-sm">{u.noteCount ?? 0}</td>
                    <td className="p-3 text-sm">{u.postCount ?? 0}</td>
                    <td className="p-3 text-sm">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="p-3">
                      <Link to={`/admin/users/${u.id}`} className="text-primary text-sm hover:underline">상세</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'teas' && (
        <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4" />
            CSV 벌크 업로드
          </div>
          <p className="text-xs text-muted-foreground">컬럼: name(필수), type(필수), origin, price, weight</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const csv = 'name,type,origin,price,weight\n예시차,녹차,한국,15000,50\n';
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'tea_template.csv';
                a.click();
              }}
            >
              템플릿 다운로드
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setCsvResult(null);
                  setCsvUploading(true);
                  try {
                    const result = await adminApi.bulkUploadTeas(file);
                    setCsvResult(result);
                    adminApi.getTeas({ search: search || undefined, limit: 50 }).then(setTeas);
                    toast.success(`등록 ${result.success}건 / 스킵 ${result.skipped}건 / 오류 ${result.errors.length}건`);
                  } catch {
                    toast.error('업로드 실패');
                  } finally {
                    setCsvUploading(false);
                    e.target.value = '';
                  }
                }}
              />
              <Button size="sm" disabled={csvUploading} asChild>
                <span>{csvUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}CSV 업로드</span>
              </Button>
            </label>
          </div>
          {csvResult && (
            <div className="text-xs space-y-1">
              <p>총 {csvResult.total}행 · 등록 <span className="text-green-600 font-medium">{csvResult.success}</span> · 스킵 {csvResult.skipped} · 오류 {csvResult.errors.length}</p>
              {csvResult.errors.map((e) => (
                <p key={e.row} className="text-destructive">{e.row}행: {e.message}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'teas' && (
        <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4" />
            찻집 URL 크롤링
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="URL (https://...)" value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} className="col-span-2 h-8 text-sm" />
            <Input placeholder="차 이름 선택자 (예: .product-name)" value={crawlNameSel} onChange={(e) => setCrawlNameSel(e.target.value)} className="h-8 text-sm" />
            <Input placeholder="차 종류 선택자 (선택)" value={crawlTypeSel} onChange={(e) => setCrawlTypeSel(e.target.value)} className="h-8 text-sm" />
            <Input placeholder="가격 선택자 (선택)" value={crawlPriceSel} onChange={(e) => setCrawlPriceSel(e.target.value)} className="h-8 text-sm" />
          </div>
          <Button
            size="sm"
            disabled={crawlPreviewing || !crawlUrl || !crawlNameSel}
            onClick={async () => {
              setCrawlPreviewing(true);
              setCrawlItems([]);
              try {
                const items = await adminApi.crawlPreview(crawlUrl, {
                  nameSelector: crawlNameSel,
                  typeSelector: crawlTypeSel || undefined,
                  priceSelector: crawlPriceSel || undefined,
                });
                setCrawlItems(items.map((i) => ({ ...i, selected: true })));
              } catch { toast.error('크롤링 실패'); }
              finally { setCrawlPreviewing(false); }
            }}
          >
            {crawlPreviewing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}미리보기
          </Button>
          {crawlItems.length > 0 && (
            <>
              <div className="max-h-48 overflow-y-auto border border-border rounded text-xs">
                <table className="w-full">
                  <thead><tr className="bg-muted/50"><th className="p-2 text-left w-6">✓</th><th className="p-2 text-left">이름</th><th className="p-2 text-left">종류</th><th className="p-2 text-left">가격</th></tr></thead>
                  <tbody>
                    {crawlItems.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2"><input type="checkbox" checked={item.selected} onChange={(e) => setCrawlItems((prev) => prev.map((it, i) => i === idx ? { ...it, selected: e.target.checked } : it))} /></td>
                        <td className="p-2">{item.name}</td>
                        <td className="p-2">{item.type}</td>
                        <td className="p-2">{item.price?.toLocaleString() ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                size="sm"
                disabled={crawlRegistering || crawlItems.every((i) => !i.selected)}
                onClick={async () => {
                  setCrawlRegistering(true);
                  try {
                    const selected = crawlItems.filter((i) => i.selected).map(({ name, type, price }) => ({ name, type, price }));
                    const r = await adminApi.crawlRegister(selected);
                    adminApi.getTeas({ search: search || undefined, limit: 50 }).then(setTeas);
                    toast.success(`등록 ${r.success}건 / 스킵 ${r.skipped}건`);
                    setCrawlItems([]);
                  } catch { toast.error('등록 실패'); }
                  finally { setCrawlRegistering(false); }
                }}
              >
                {crawlRegistering ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}선택 항목 등록
              </Button>
            </>
          )}
        </div>
      )}

      {tab === 'teas' && (
        loading ? <Loader2 className="w-8 h-8 animate-spin" /> : (
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-3 text-left text-sm font-medium">ID</th>
                  <th className="p-3 text-left text-sm font-medium">이름</th>
                  <th className="p-3 text-left text-sm font-medium">종류</th>
                  <th className="p-3 text-left text-sm font-medium">연도</th>
                  <th className="p-3 text-left text-sm font-medium">판매처</th>
                  <th className="p-3 text-left text-sm font-medium">원산지</th>
                  <th className="p-3 text-left text-sm font-medium">가격</th>
                  <th className="p-3 text-left text-sm font-medium">평점/리뷰</th>
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
                            if (name && type) handleUpdateTea(t.id, { name, year: yearStr === '' ? null : parseInt(yearStr, 10), type, seller: seller === '' ? null : seller });
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
                    <td className="p-3 text-sm">{t.year ?? '-'}</td>
                    <td className="p-3 text-sm">{t.seller || '-'}</td>
                    <td className="p-3 text-sm">{t.origin || '-'}</td>
                    <td className="p-3 text-sm">{t.price != null ? t.price.toLocaleString() : '-'}</td>
                    <td className="p-3 text-sm">{t.averageRating ?? 0} / {t.reviewCount ?? 0}</td>
                    <td className="p-3 flex gap-1">
                      {!(editing?.type === 'tea' && editing?.id === t.id) && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setDetailOpen({ type: 'tea', id: t.id })} aria-label="상세" title="전체 정보 보기/수정">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ type: 'tea', id: t.id })} aria-label="차 수정" title="차 수정">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteTea(t.id)} aria-label="차 삭제" title="차 삭제">
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
                  <th className="p-3 text-left text-sm font-medium">주소</th>
                  <th className="p-3 text-left text-sm font-medium">전화</th>
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
                            const form = e.currentTarget;
                            const address = (form.elements.namedItem('sellerEditAddress') as HTMLInputElement)?.value?.trim();
                            const mapUrl = (form.elements.namedItem('sellerEditMapUrl') as HTMLInputElement)?.value?.trim();
                            const websiteUrl = (form.elements.namedItem('sellerEditWebsiteUrl') as HTMLInputElement)?.value?.trim();
                            const phone = (form.elements.namedItem('sellerEditPhone') as HTMLInputElement)?.value?.trim();
                            const businessHours = (form.elements.namedItem('sellerEditBusinessHours') as HTMLInputElement)?.value?.trim();
                            handleUpdateSeller(s.id, {
                              address: address === '' ? null : address,
                              mapUrl: mapUrl === '' ? null : mapUrl,
                              websiteUrl: websiteUrl === '' ? null : websiteUrl,
                              phone: phone === '' ? null : phone,
                              businessHours: businessHours === '' ? null : businessHours,
                            });
                          }}
                          className="flex flex-wrap gap-2 items-center"
                        >
                          <Input name="sellerEditAddress" defaultValue={s.address ?? ''} placeholder="주소" className="w-48" />
                          <Input name="sellerEditMapUrl" defaultValue={s.mapUrl ?? ''} placeholder="지도 URL" className="w-40" />
                          <Input name="sellerEditWebsiteUrl" defaultValue={s.websiteUrl ?? ''} placeholder="웹사이트" className="w-40" />
                          <Input name="sellerEditPhone" defaultValue={s.phone ?? ''} placeholder="전화" className="w-28" />
                          <Input name="sellerEditBusinessHours" defaultValue={s.businessHours ?? ''} placeholder="영업시간" className="w-28" />
                          <Button size="sm" type="submit">저장</Button>
                          <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(null)}>취소</Button>
                        </form>
                      ) : (
                        s.name
                      )}
                    </td>
                    <td className="p-3 text-sm max-w-[120px] truncate" title={s.address ?? ''}>{s.address || '-'}</td>
                    <td className="p-3 text-sm">{s.phone || '-'}</td>
                    <td className="p-3 text-sm">{s.teaCount ?? 0}</td>
                    <td className="p-3 flex gap-1">
                      {!(editing?.type === 'seller' && editing?.id === s.id) && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setDetailOpen({ type: 'seller', id: s.id })} aria-label="상세" title="전체 정보 보기/수정">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ type: 'seller', id: s.id })} aria-label="찻집 수정" title="찻집 수정">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteSeller(s.id)} aria-label="찻집 삭제" title="찻집 삭제">
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
                  <th className="p-3 text-left text-sm font-medium">생성일</th>
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
                    <td className="p-3 text-sm">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="p-3 flex gap-1">
                      {!(editing?.type === 'tag' && editing?.id === t.id) && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setDetailOpen({ type: 'tag', id: t.id })} aria-label="상세" title="전체 정보 보기/수정">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ type: 'tag', id: t.id, name: t.name })} aria-label="태그 수정" title="태그 수정">
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
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteTag(t.id)} aria-label="태그 삭제" title="태그 삭제">
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

      {/* Detail Modal - 전체 정보 보기/수정 */}
      <Dialog open={!!detailOpen} onOpenChange={(open) => !open && setDetailOpen(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {detailOpen?.type === 'tea' && '차 상세'}
              {detailOpen?.type === 'seller' && '찻집 상세'}
              {detailOpen?.type === 'tag' && '태그 상세'}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : detailData ? (
            <form onSubmit={handleSaveDetail} className="space-y-4">
              {detailOpen?.type === 'tea' && (
                <>
                  <div><Label>ID</Label><p className="text-sm text-muted-foreground">{detailData.id}</p></div>
                  <div><Label>이름 *</Label><Input name="dtName" defaultValue={detailData.name} required /></div>
                  <div><Label>연도</Label><Input name="dtYear" type="number" defaultValue={detailData.year ?? ''} placeholder="2024" /></div>
                  <div><Label>종류 *</Label>
                    <select name="dtType" defaultValue={detailData.type} required className="w-full border rounded px-3 py-2 bg-background">
                      {TEA_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
                    </select>
                  </div>
                  <div><Label>판매처</Label><Input name="dtSeller" defaultValue={detailData.seller ?? ''} placeholder="찻집 이름" /></div>
                  <div><Label>원산지</Label><Input name="dtOrigin" defaultValue={detailData.origin ?? ''} /></div>
                  <div><Label>가격</Label><Input name="dtPrice" type="number" defaultValue={detailData.price ?? ''} /></div>
                  <div><Label>무게 (g)</Label><Input name="dtWeight" type="number" min={0} defaultValue={detailData.weight ?? ''} /></div>
                  <div><Label>평균 평점 / 리뷰 수</Label><p className="text-sm">{detailData.averageRating ?? 0} / {detailData.reviewCount ?? 0}</p></div>
                  <div><Label>차록 수</Label><p className="text-sm">{detailData.noteCount ?? 0}</p></div>
                  <div><Label>생성/수정일</Label><p className="text-sm">{detailData.createdAt ? new Date(detailData.createdAt).toLocaleString() : '-'} / {detailData.updatedAt ? new Date(detailData.updatedAt).toLocaleString() : '-'}</p></div>
                </>
              )}
              {detailOpen?.type === 'seller' && (
                <>
                  <div><Label>ID</Label><p className="text-sm text-muted-foreground">{detailData.id}</p></div>
                  <div><Label>이름 *</Label><Input name="dtName" defaultValue={detailData.name} required /></div>
                  <div><Label>주소</Label><Input name="dtAddress" defaultValue={detailData.address ?? ''} /></div>
                  <div><Label>지도 URL</Label><Input name="dtMapUrl" defaultValue={detailData.mapUrl ?? ''} /></div>
                  <div><Label>웹사이트</Label><Input name="dtWebsiteUrl" defaultValue={detailData.websiteUrl ?? ''} /></div>
                  <div><Label>전화</Label><Input name="dtPhone" defaultValue={detailData.phone ?? ''} /></div>
                  <div><Label>설명</Label><Textarea name="dtDescription" defaultValue={detailData.description ?? ''} rows={3} /></div>
                  <div><Label>영업시간</Label><Input name="dtBusinessHours" defaultValue={detailData.businessHours ?? ''} /></div>
                  <div><Label>차 수</Label><p className="text-sm">{detailData.teaCount ?? 0}</p></div>
                  <div><Label>생성일</Label><p className="text-sm">{detailData.createdAt ? new Date(detailData.createdAt).toLocaleString() : '-'}</p></div>
                </>
              )}
              {detailOpen?.type === 'tag' && (
                <>
                  <div><Label>ID</Label><p className="text-sm text-muted-foreground">{detailData.id}</p></div>
                  <div><Label>이름 *</Label><Input name="dtName" defaultValue={detailData.name} required /></div>
                  <div><Label>사용 수</Label><p className="text-sm">{detailData.usageCount ?? 0}</p></div>
                  <div><Label>생성/수정일</Label><p className="text-sm">{detailData.createdAt ? new Date(detailData.createdAt).toLocaleString() : '-'} / {detailData.updatedAt ? new Date(detailData.updatedAt).toLocaleString() : '-'}</p></div>
                </>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDetailOpen(null)}>닫기</Button>
                <Button type="submit" disabled={detailSaving}>{detailSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}저장</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create Tea Modal */}
      <Dialog open={createOpen.tea} onOpenChange={(open) => setCreateOpen((o) => ({ ...o, tea: open }))}>
        <DialogContent aria-describedby={undefined}>
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
              <div className="flex flex-wrap gap-2 mb-1">
                {COMMON_PRICES.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      const input = (e.currentTarget.closest('form')?.elements.namedItem('teaPrice') as HTMLInputElement);
                      if (input) {
                        const current = parseInt(input.value, 10) || 0;
                        input.value = String(current + p);
                      }
                    }}
                  >
                    +{formatPriceToKorean(p)}원
                  </Button>
                ))}
              </div>
              <Input name="teaPrice" type="number" placeholder="직접 입력" />
            </div>
            <div>
              <Label>무게 (g)</Label>
              <div className="flex flex-wrap gap-2 mb-1">
                {COMMON_WEIGHTS.map((w) => (
                  <Button
                    key={w}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      const input = (e.currentTarget.closest('form')?.elements.namedItem('teaWeight') as HTMLInputElement);
                      if (input) {
                        const current = parseInt(input.value, 10) || 0;
                        input.value = String(current + w);
                      }
                    }}
                  >
                    +{w}g
                  </Button>
                ))}
              </div>
              <Input name="teaWeight" type="number" placeholder="직접 입력" min={0} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen((o) => ({ ...o, tea: false }))}>취소</Button>
              <Button type="submit" disabled={creating.tea}>{creating.tea && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Seller Modal */}
      <Dialog open={createOpen.seller} onOpenChange={(open) => setCreateOpen((o) => ({ ...o, seller: open }))}>
        <DialogContent aria-describedby={undefined}>
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
              <Label>설명</Label>
              <Textarea name="sellerDescription" rows={3} placeholder="찻집 소개" />
            </div>
            <div>
              <Label>영업시간</Label>
              <Input name="sellerBusinessHours" placeholder="09:00-18:00" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen((o) => ({ ...o, seller: false }))}>취소</Button>
              <Button type="submit" disabled={creating.seller}>{creating.seller && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Tag Modal */}
      <Dialog open={createOpen.tag} onOpenChange={(open) => setCreateOpen((o) => ({ ...o, tag: open }))}>
        <DialogContent aria-describedby={undefined}>
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
              <Button onClick={handleCreateTag} disabled={creating.tag}>{creating.tag && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}추가</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
