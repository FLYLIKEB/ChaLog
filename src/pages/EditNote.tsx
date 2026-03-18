import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { StarRating } from '../components/StarRating';
import { AddTemplateModal } from '../components/AddTemplateModal';
import { ImageUploader } from '../components/ImageUploader';
import { TagInput } from '../components/TagInput';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { TemplateSelect } from '../components/TemplateSelect';
import { RatingGuideModal } from '../components/RatingGuideModal';
import { DetailFallback } from '../components/DetailFallback';
import { TeaSearchSection } from '../components/TeaSearchSection';
import { AxisRatingSection } from '../components/AxisRatingSection';
import { useAuth } from '../contexts/AuthContext';
import { useNoteForm } from '../hooks/useNoteForm';

export function EditNote() {
  const { id } = useParams();
  const noteId = id ? parseInt(id, 10) : NaN;
  const { isAuthenticated } = useAuth();
  const teaInputRef = useRef<HTMLInputElement>(null);

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
    isPublic,
    setIsPublic,
    isSaving,
    addTemplateOpen,
    setAddTemplateOpen,
    isLoading,
    note,
    handleTemplateAdded,
    handleSave,
  } = useNoteForm({ mode: 'edit', noteId });

  const { query: searchQuery, setQuery: setSearchQuery, results: filteredTeas, selectedTeaData, selectTea, clearSelection } = teaSelector;

  if (isLoading) {
    return (
      <DetailFallback title="차록 수정">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DetailFallback>
    );
  }

  if (!note) {
    return (
      <DetailFallback
        title="차록 수정"
        message="차록을 찾을 수 없거나 수정할 권한이 없습니다."
      />
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="차록 수정" showProfile showLogo />

      <div className="p-4 pb-24 space-y-4">
        <TeaSearchSection
          inputRef={teaInputRef}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTea={selectedTea}
          filteredTeas={filteredTeas}
          selectedTeaData={selectedTeaData}
          onSelectTea={selectTea}
          onClearTea={clearSelection}
          newTeaBasePath={`/tea/new?returnTo=/note/${noteId}/edit`}
        />

        <section className="bg-card rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Label className="text-base font-semibold text-foreground">
              평점 <span className="text-destructive">*</span>
            </Label>
            <RatingGuideModal />
          </div>
          <StarRating value={overallRating} onChange={setOverallRating} max={5} size="lg" />
        </section>

        <section className="bg-card rounded-lg p-4">
          <Label className="mb-2 block text-base font-semibold text-foreground">
            테이스팅 템플릿
          </Label>
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
        </section>

        <AddTemplateModal
          open={addTemplateOpen}
          onOpenChange={setAddTemplateOpen}
          onSuccess={handleTemplateAdded}
        />

        <AxisRatingSection
          selectedSchemaIds={selectedSchemaIds}
          axes={axes}
          schemas={schemas}
          axisValues={axisValues}
          onAxisChange={(axisId, value) => setAxisValues((prev) => ({ ...prev, [axisId]: value }))}
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
