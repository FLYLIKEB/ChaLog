import React, { useRef, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CalendarDays } from 'lucide-react';
import { Header } from '../components/Header';
import { AxisStarRow } from '../components/AxisStarRow';
import { AddTemplateModal } from '../components/AddTemplateModal';
import { ImageUploader } from '../components/ImageUploader';
import { TagInput } from '../components/TagInput';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { TemplateSelect } from '../components/TemplateSelect';
import { TeaSearchSection } from '../components/TeaSearchSection';
import { AxisRatingSection } from '../components/AxisRatingSection';
import { cn } from '../components/ui/utils';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { useAuth } from '../contexts/AuthContext';
import { useNoteForm } from '../hooks/useNoteForm';
import { RATING_DEFAULT } from '../constants';

export function NewNote() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedTeaId = searchParams.get('teaId');
  const isSampleMode = searchParams.get('sample') === '1';
  const teaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!preselectedTeaId && !isSampleMode) {
      const timer = setTimeout(() => teaInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const {
    teaSelector,
    selectedTea,
    schemas,
    pinnedSchemaIds,
    setPinnedSchemaIds,
    selectedSchemaIds,
    setSelectedSchemaIds,
    axes,
    axisValues,
    setAxisValues,
    overallRating,
    setOverallRating,
    memo,
    setMemo,
    images,
    imageThumbnails,
    setImagesAndThumbnails,
    tags,
    setTags,
    drinkDate,
    setDrinkDate,
    isPublic,
    setIsPublic,
    isSaving,
    addTemplateOpen,
    setAddTemplateOpen,
    handleTemplateAdded,
    handleSave,
  } = useNoteForm({
    mode: 'new',
    preselectedTeaId: preselectedTeaId ? parseInt(preselectedTeaId, 10) : null,
    isSampleMode,
  });

  const { query: searchQuery, setQuery: setSearchQuery, results: filteredTeas, selectedTeaData, selectTea, clearSelection } = teaSelector;
  const [scale, setScale] = useState<5 | 10>(5);

  return (
    <div className="min-h-screen">
      <Header showBack title="새 차록 작성" showProfile showLogo />

      <div className="p-4 pb-24 space-y-4">
        {isSampleMode && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200">
            샘플 평가 체험 중입니다. 저장되지 않아요.
          </div>
        )}

        {isSampleMode ? (
          <section className="bg-card rounded-lg p-3">
            <Label className="mb-1.5 block text-sm">차 선택</Label>
            <div className="py-2.5 px-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              샘플 녹차 (체험용)
            </div>
          </section>
        ) : (
          <TeaSearchSection
            inputRef={teaInputRef}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTea={selectedTea}
            filteredTeas={filteredTeas}
            selectedTeaData={selectedTeaData}
            onSelectTea={selectTea}
            onClearTea={clearSelection}
            newTeaBasePath="/tea/new?returnTo=/note/new"
          />
        )}

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>
                {drinkDate
                  ? new Date(drinkDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                  : '날짜 선택'}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={drinkDate ? new Date(drinkDate) : undefined}
              onSelect={(d) => {
                if (d) setDrinkDate(d.toLocaleDateString('sv-SE'));
              }}
              disabled={{ after: new Date() }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <section className="bg-card rounded-lg p-4">
          <AxisStarRow
            label="평점"
            value={overallRating ?? RATING_DEFAULT}
            onChange={setOverallRating}
          />
        </section>

        {overallRating !== null && (
          <>
            <section className="bg-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex rounded-md border border-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setScale(5)}
                    className={cn('px-2 py-0.5 transition-colors', scale === 5 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                  >5점</button>
                  <button
                    type="button"
                    onClick={() => setScale(10)}
                    className={cn('px-2 py-0.5 transition-colors', scale === 10 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                  >10점</button>
                </div>
                <Label className="text-base font-semibold text-foreground">테이스팅 템플릿</Label>
              </div>
              {schemas.length > 0 ? (
                <TemplateSelect
                  schemas={schemas}
                  pinnedSchemaIds={pinnedSchemaIds}
                  onPinnedChange={setPinnedSchemaIds}
                  value={selectedSchemaIds}
                  onChange={(v) => setSelectedSchemaIds(Array.isArray(v) ? v : v != null ? [v] : [])}
                  onAddTemplate={() => setAddTemplateOpen(true)}
                  isAuthenticated={isAuthenticated}
                  multiple
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2">사용 가능한 템플릿이 없습니다.</p>
              )}
              <AxisRatingSection
                selectedSchemaIds={selectedSchemaIds}
                axes={axes}
                schemas={schemas}
                axisValues={axisValues}
                onAxisChange={(axisId, value) => setAxisValues((prev) => ({ ...prev, [axisId]: value }))}
                displayMultiplier={scale === 10 ? 2 : 1}
              />
            </section>

            <AddTemplateModal
              open={addTemplateOpen}
              onOpenChange={setAddTemplateOpen}
              onSuccess={handleTemplateAdded}
            />

            <section className="bg-card rounded-lg p-4">
              <ImageUploader
                images={images}
                imageThumbnails={imageThumbnails}
                onChange={setImagesAndThumbnails}
                maxImages={5}
              />
            </section>

            <section
              className="bg-card rounded-lg p-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              <TagInput tags={tags} onChange={setTags} maxTags={10} />
            </section>

            <section className="bg-card rounded-lg p-4">
              <Label className="mb-2 block text-sm font-medium">메모</Label>
              <Textarea
                placeholder="향·맛·여운에 대해 자유롭게 기록해보세요."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={5}
              />
            </section>

            <section className="bg-card rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label>공개 설정</Label>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </section>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/80 dark:bg-background/90 backdrop-blur-sm z-40">
        <Button
          onClick={handleSave}
          className="w-full opacity-70 hover:opacity-100 transition-opacity"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            '저장'
          )}
        </Button>
      </div>
    </div>
  );
}
