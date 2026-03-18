import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Package, PenLine, Leaf, ShoppingBag, Tag } from 'lucide-react';
import { TeaCard } from '../TeaCard';
import { TeaCardSkeleton } from '../TeaCardSkeleton';
import { NoteCard } from '../NoteCard';
import { NoteCardSkeleton } from '../NoteCardSkeleton';
import { EmptyState } from '../EmptyState';
import { CtaButton } from '../ui/CtaButton';
import { Tea, Seller, Note, CellarItem } from '../../types';
import { LucideIcon } from 'lucide-react';

type SearchCategory = 'all' | 'tea' | 'note' | 'cellar' | 'seller' | 'tag';

const CATEGORY_CREATE_CONFIG: Partial<Record<SearchCategory, { label: string; path: string; icon: LucideIcon }>> = {
  tea: { label: '새 차 등록하기', path: '/tea/new', icon: Leaf },
  note: { label: '차록 쓰기', path: '/note/new', icon: PenLine },
  cellar: { label: '찻장에 추가하기', path: '/cellar/new', icon: ShoppingBag },
  seller: { label: '찻집 등록하기', path: '/teahouse/new', icon: Store },
  tag: { label: '향미 추가하기', path: '/tags', icon: Tag },
};

function CategoryCreateButton({ category }: { category: SearchCategory }) {
  const navigate = useNavigate();
  const config = CATEGORY_CREATE_CONFIG[category];
  if (!config) return null;
  return (
    <CtaButton
      onClick={() => navigate(config.path)}
      icon={config.icon}
      label={config.label}
      variant="primary"
    />
  );
}

interface SearchResultsProps {
  searchCategory: SearchCategory;
  isLoading: boolean;
  categoryLoading: boolean;
  teas: Tea[];
  noteResults: Note[];
  cellarResults: CellarItem[];
  sellerResults: Seller[];
  tagResults: { name: string; noteCount: number }[];
  hasSearched: boolean;
  hasFilterParams: boolean;
  onGoBack: () => void;
}

export function SearchResults({
  searchCategory,
  isLoading,
  categoryLoading,
  teas,
  noteResults,
  cellarResults,
  sellerResults,
  tagResults,
  hasSearched,
  hasFilterParams,
  onGoBack,
}: SearchResultsProps) {
  const navigate = useNavigate();

  return (
    <>
      {searchCategory === 'all' && (
        <>
          {isLoading && categoryLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3">
                {[1, 2, 3].map((i) => <TeaCardSkeleton key={i} />)}
              </div>
            </div>
          ) : teas.length === 0 && noteResults.length === 0 && sellerResults.length === 0 && tagResults.length === 0 ? (
            <>
              <EmptyState type="search" message="검색 결과가 없어요." action={{ label: '검색어 바꿔보기', onClick: onGoBack }} />
              <CategoryCreateButton category="tea" />
            </>
          ) : (
            <div className="space-y-6">
              {teas.length > 0 && (
                <section>
                  <p className="text-xs font-medium text-muted-foreground mb-2">차 {teas.length}개</p>
                  <div className="grid grid-cols-1 gap-3">
                    {teas.slice(0, 5).map((tea) => <TeaCard key={tea.id} tea={tea} />)}
                  </div>
                </section>
              )}
              {noteResults.length > 0 && (
                <section>
                  <p className="text-xs font-medium text-muted-foreground mb-2">차록 {noteResults.length}개</p>
                  <div className="grid grid-cols-3 gap-2">
                    {noteResults.slice(0, 6).map((note) => <NoteCard key={note.id} note={note} />)}
                  </div>
                </section>
              )}
              {sellerResults.length > 0 && (
                <section>
                  <p className="text-xs font-medium text-muted-foreground mb-2">찻집 {sellerResults.length}개</p>
                  <div className="flex flex-wrap gap-2">
                    {sellerResults.slice(0, 6).map((seller) => (
                      <button
                        key={seller.name}
                        type="button"
                        onClick={() => navigate(`/teahouse/${encodeURIComponent(seller.name)}`)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{seller.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {tagResults.length > 0 && (
                <section>
                  <p className="text-xs font-medium text-muted-foreground mb-2">향미 태그 {tagResults.length}개</p>
                  <div className="flex flex-wrap gap-2">
                    {tagResults.slice(0, 8).map((tag) => (
                      <button
                        key={tag.name}
                        type="button"
                        onClick={() => navigate(`/tag/${encodeURIComponent(tag.name)}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-border/60 bg-background hover:bg-muted/60 transition-colors"
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {searchCategory === 'tea' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5].map((i) => <TeaCardSkeleton key={i} />)}
            </div>
          ) : teas.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">결과 {teas.length}개</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {teas.map((tea, i) => (
                  <div key={tea.id} className="animate-fade-in-up opacity-0" style={{ animationDelay: `${i * 50}ms` }}>
                    <TeaCard tea={tea} />
                  </div>
                ))}
              </div>
            </>
          ) : hasSearched || hasFilterParams ? (
            <>
              <EmptyState type="search" message="검색 결과가 없어요." />
              <CategoryCreateButton category="tea" />
            </>
          ) : null}
        </>
      )}

      {searchCategory === 'note' && (
        <>
          {categoryLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <NoteCardSkeleton key={i} />)}
            </div>
          ) : noteResults.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">결과 {noteResults.length}개</p>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                {noteResults.map((note) => <NoteCard key={note.id} note={note} />)}
              </div>
            </>
          ) : (
            <>
              <EmptyState type="search" message="차록이 없어요." />
              <CategoryCreateButton category="note" />
            </>
          )}
        </>
      )}

      {searchCategory === 'cellar' && (
        <>
          {categoryLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />)}
            </div>
          ) : cellarResults.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">결과 {cellarResults.length}개</p>
              <div className="space-y-2">
                {cellarResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/cellar/${item.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors text-left"
                  >
                    <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.tea?.name}</p>
                      {item.tea?.type && <p className="text-xs text-muted-foreground">{item.tea.type}</p>}
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">{item.quantity}{item.unit}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <EmptyState type="search" message="찻장이 비어있어요." />
              <CategoryCreateButton category="cellar" />
            </>
          )}
        </>
      )}

      {searchCategory === 'seller' && (
        <>
          {categoryLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-9 w-24 rounded-lg bg-muted/50 animate-pulse" />)}
            </div>
          ) : sellerResults.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">결과 {sellerResults.length}개</p>
              <div className="flex flex-wrap gap-2">
                {sellerResults.map((seller) => (
                  <button
                    key={seller.name}
                    type="button"
                    onClick={() => navigate(`/teahouse/${encodeURIComponent(seller.name)}`)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <Store className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{seller.name}</span>
                    <span className="text-xs text-muted-foreground">{seller.teaCount}종</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <EmptyState type="search" message="찻집 검색 결과가 없어요." />
              <CategoryCreateButton category="seller" />
            </>
          )}
        </>
      )}

      {searchCategory === 'tag' && (
        <>
          {categoryLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-8 w-16 rounded-full bg-muted/50 animate-pulse" />)}
            </div>
          ) : tagResults.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">결과 {tagResults.length}개</p>
              <div className="flex flex-wrap gap-2">
                {tagResults.map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => navigate(`/tag/${encodeURIComponent(tag.name)}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-border/60 bg-background hover:bg-muted/60 transition-colors"
                  >
                    #{tag.name}
                    {tag.noteCount > 0 && <span className="text-xs opacity-60">({tag.noteCount})</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <EmptyState type="search" message="향미 검색 결과가 없어요." />
              <CategoryCreateButton category="tag" />
            </>
          )}
        </>
      )}
    </>
  );
}
