import React, { useCallback, useEffect, useState } from 'react';
import { Pin, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { teawareApi, CreateTeawareRequest } from '../../lib/api/teaware.api';
import { Teaware } from '../../types';
import { toast } from 'sonner';
import { logger } from '../../lib/logger';

const CATEGORY_LABELS: Record<string, string> = {
  ZISHA_HU: '자사호',
  GAIWAN: '개완',
  GONGDAO_BEI: '공도배',
  CUP: '잔',
  FAIRNESS_CUP: '숙우',
  TEA_TRAY: '차판',
  OTHER: '기타',
};

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

interface AddTeawareFormState {
  name: string;
  category: string;
  capacity: string;
  material: string;
  memo: string;
}

const EMPTY_FORM: AddTeawareFormState = {
  name: '',
  category: 'GAIWAN',
  capacity: '',
  material: '',
  memo: '',
};

export function TeawareSection() {
  const [teawares, setTeawares] = useState<Teaware[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<AddTeawareFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingPinId, setTogglingPinId] = useState<number | null>(null);

  const fetchTeawares = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await teawareApi.getAll();
      setTeawares(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Failed to fetch teawares:', error);
      toast.error('다구 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeawares();
  }, [fetchTeawares]);

  const handleTogglePin = async (teaware: Teaware) => {
    if (togglingPinId !== null) return;
    try {
      setTogglingPinId(teaware.id);
      const updated = await teawareApi.togglePin(teaware.id);
      setTeawares((prev) =>
        prev.map((t) => (t.id === teaware.id ? { ...t, isPinned: (updated as Teaware).isPinned } : t)),
      );
    } catch (error) {
      logger.error('Failed to toggle pin:', error);
      toast.error('핀 설정 변경에 실패했습니다.');
    } finally {
      setTogglingPinId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (deletingId !== null) return;
    try {
      setDeletingId(id);
      await teawareApi.remove(id);
      setTeawares((prev) => prev.filter((t) => t.id !== id));
      toast.success('다구가 삭제되었습니다.');
    } catch (error) {
      logger.error('Failed to delete teaware:', error);
      toast.error('다구 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenDialog = () => {
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('다구 이름을 입력해주세요.');
      return;
    }
    try {
      setIsSaving(true);
      const payload: CreateTeawareRequest = {
        name: form.name.trim(),
        category: form.category,
        capacity: form.capacity ? parseFloat(form.capacity) : null,
        material: form.material.trim() || null,
        memo: form.memo.trim() || null,
      };
      const created = await teawareApi.create(payload);
      setTeawares((prev) => [...prev, created as Teaware]);
      toast.success('다구가 추가되었습니다.');
      setIsDialogOpen(false);
    } catch (error) {
      logger.error('Failed to create teaware:', error);
      toast.error('다구 추가에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">내 다구</h3>
        <Button variant="outline" size="sm" onClick={handleOpenDialog}>
          <Plus className="w-4 h-4 mr-1" />
          추가
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : teawares.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">등록된 다구가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {teawares.map((teaware) => (
            <li
              key={teaware.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">{teaware.name}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {CATEGORY_LABELS[teaware.category] ?? teaware.category}
                  </Badge>
                  {teaware.isPinned && (
                    <Badge variant="outline" className="text-xs shrink-0 text-primary border-primary/40">
                      핀
                    </Badge>
                  )}
                </div>
                {teaware.capacity != null && (
                  <p className="text-xs text-muted-foreground mt-0.5">{teaware.capacity}ml</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={teaware.isPinned ? '핀 해제' : '핀 고정'}
                  disabled={togglingPinId === teaware.id}
                  onClick={() => handleTogglePin(teaware)}
                >
                  {togglingPinId === teaware.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Pin
                      className={`w-4 h-4 ${teaware.isPinned ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                    />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  aria-label="삭제"
                  disabled={deletingId === teaware.id}
                  onClick={() => handleDelete(teaware.id)}
                >
                  {deletingId === teaware.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 다구 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="teaware-name">이름 *</Label>
              <Input
                id="teaware-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="다구 이름"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teaware-category">카테고리</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((prev) => ({ ...prev, category: v }))}
              >
                <SelectTrigger id="teaware-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teaware-capacity">용량 (ml)</Label>
              <Input
                id="teaware-capacity"
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
                placeholder="예: 120"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teaware-material">재질</Label>
              <Input
                id="teaware-material"
                value={form.material}
                onChange={(e) => setForm((prev) => ({ ...prev, material: e.target.value }))}
                placeholder="예: 자사, 도자기"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teaware-memo">메모</Label>
              <Input
                id="teaware-memo"
                value={form.memo}
                onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
                placeholder="간단한 메모"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
