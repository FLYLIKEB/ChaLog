import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { PostImageUploader } from '../components/PostImageUploader';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../components/ui/utils';
import { usePostForm, WRITE_GROUPS } from '../hooks/usePostForm';

export function EditPost() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const postId = Number(id);

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
    isLoadingPost,
    handleSubmit,
  } = usePostForm({ mode: 'edit', postId });

  if (isLoadingPost) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="게시글 수정" showProfile />

      <form onSubmit={handleSubmit} className="px-4 py-4 flex flex-col gap-5">
        {/* 카테고리 선택 (등록과 동일한 2단계) */}
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
          <label className="text-sm font-medium text-foreground" htmlFor="edit-title">
            제목 <span className="text-destructive">*</span>
          </label>
          <Input
            id="edit-title"
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
          <label className="text-sm font-medium text-foreground" htmlFor="edit-content">
            내용 <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="edit-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요. 마크다운(제목, 리스트, 링크, 테이블 등)을 사용할 수 있어요."
            rows={8}
          />
          <p className="text-xs text-muted-foreground">마크다운 문법 지원</p>
        </div>

        {/* 사진 */}
        <PostImageUploader images={images} onChange={setImages} maxImages={5} />

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
              수정 중...
            </>
          ) : (
            '게시글 수정'
          )}
        </Button>
      </form>
    </div>
  );
}
