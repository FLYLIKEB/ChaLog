import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, BookOpen, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Note } from '../types';
import { notesApi } from '../lib/api';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { PostImageUploader } from '../components/PostImageUploader';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../components/ui/utils';
import { usePostForm, WRITE_GROUPS } from '../hooks/usePostForm';

export function NewPost() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const {
    title, setTitle,
    content, setContent,
    selectedGroup, setSelectedGroup,
    category, setCategory,
    isAnonymous, setIsAnonymous,
    isPinned, setIsPinned,
    isSponsored, setIsSponsored,
    sponsorNote, setSponsorNote,
    images, setImages,
    isSubmitting,
    taggedNoteIds, setTaggedNoteIds,
    handleSubmit,
  } = usePostForm({ mode: 'new' });

  const [taggedNotes, setTaggedNotes] = useState<Pick<Note, 'id' | 'teaName' | 'overallRating'>[]>([]);
  const [notePickerOpen, setNotePickerOpen] = useState(false);
  const [myNotes, setMyNotes] = useState<Pick<Note, 'id' | 'teaName' | 'overallRating'>[]>([]);
  const [noteSearch, setNoteSearch] = useState('');

  useEffect(() => {
    if (!notePickerOpen || myNotes.length > 0 || !user) return;
    notesApi.getAll(user.id, undefined, undefined, undefined, undefined, undefined, 1, 100)
      .then((notes: Note[]) => setMyNotes(notes.map((n) => ({ id: n.id, teaName: n.teaName, overallRating: n.overallRating }))))
      .catch(() => {});
  }, [notePickerOpen, user]);

  const toggleNoteTag = (note: Pick<Note, 'id' | 'teaName' | 'overallRating'>) => {
    setTaggedNotes((prev) => {
      const next = prev.some((n) => n.id === note.id)
        ? prev.filter((n) => n.id !== note.id)
        : prev.length >= 5 ? prev : [...prev, note];
      setTaggedNoteIds(next.map((n) => n.id));
      return next;
    });
  };

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="새 게시글" showProfile showLogo />

      <form onSubmit={handleSubmit} className="px-4 py-4 flex flex-col gap-5">
        {/* 카테고리 선택 (2단계) */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-foreground">어떤 주제인가요?</label>
          <div className="flex flex-wrap gap-2">
            {WRITE_GROUPS.filter((g) => g.key !== 'announcement' || isAdmin).map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => {
                  setSelectedGroup(g.key);
                  setCategory(g.categories[0].value);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                  selectedGroup === g.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">세부 주제</span>
            <div className="flex flex-wrap gap-2">
              {WRITE_GROUPS.find((g) => g.key === selectedGroup)?.categories.map(({ value, label, hint }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  title={hint}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                    category === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 제목 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="title">
            제목 <span className="text-destructive">*</span>
          </label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            maxLength={200}
          />
          <span className="text-xs text-muted-foreground text-right">{title.length}/200</span>
        </div>

        {/* 내용 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="content">
            내용 <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요. 마크다운(제목, 리스트, 링크, 테이블 등)을 사용할 수 있어요."
            rows={8}
          />
          <p className="text-xs text-muted-foreground">마크다운 문법 지원</p>
        </div>

        {/* 사진 */}
        <PostImageUploader images={images} onChange={setImages} maxImages={5} />

        {/* 차록 태그 */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setNotePickerOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <BookOpen className="w-4 h-4" />
            차록 태그하기 ({taggedNotes.length}/5)
            {notePickerOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          </button>

          {taggedNotes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {taggedNotes.map((n) => (
                <span key={n.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {n.teaName}
                  {n.overallRating !== null && <span className="text-muted-foreground">({Number(n.overallRating).toFixed(1)})</span>}
                  <button type="button" onClick={() => toggleNoteTag(n)} className="ml-0.5 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {notePickerOpen && (
            <div className="border border-border rounded-lg p-3 flex flex-col gap-2">
              <Input
                placeholder="차 이름으로 검색"
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                {myNotes
                  .filter((n) => n.teaName.toLowerCase().includes(noteSearch.toLowerCase()))
                  .map((n) => {
                    const selected = taggedNotes.some((t) => t.id === n.id);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => toggleNoteTag(n)}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-md text-sm text-left transition-colors',
                          selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground',
                        )}
                      >
                        <span>{n.teaName}</span>
                        {n.overallRating !== null && (
                          <span className="text-xs text-muted-foreground">★ {Number(n.overallRating).toFixed(1)}</span>
                        )}
                      </button>
                    );
                  })}
                {myNotes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">작성한 차록이 없습니다.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 공지 고정 (관리자만) */}
        {isAdmin && (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-sm font-medium text-foreground">공지로 고정</span>
            </label>
          </div>
        )}

        {/* 익명 */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium text-foreground">익명으로 작성</span>
          </label>
        </div>

        {/* 광고/협찬 */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isSponsored}
              onChange={(e) => setIsSponsored(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium text-foreground">광고/협찬 게시글</span>
          </label>

          {isSponsored && (
            <Input
              type="text"
              value={sponsorNote}
              onChange={(e) => setSponsorNote(e.target.value)}
              placeholder="협찬 다실 또는 내용을 입력하세요 (선택)"
              maxLength={300}
            />
          )}
        </div>

        {/* 제출 버튼 */}
        <Button
          type="submit"
          disabled={isSubmitting || !title.trim() || !content.trim()}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              작성 중...
            </>
          ) : (
            '게시글 작성'
          )}
        </Button>
      </form>
    </div>
  );
}
