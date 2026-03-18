import React, { RefObject } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { TeaTypeBadge } from './TeaTypeBadge';
import { Tea } from '../types';

interface SelectedTeaData {
  name: string;
  type?: string;
  year?: number;
  seller?: string;
}

interface TeaSearchSectionProps {
  inputRef: RefObject<HTMLInputElement>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedTea: number | null | undefined;
  filteredTeas: Tea[];
  selectedTeaData: SelectedTeaData | null | undefined;
  onSelectTea: (id: number, name: string) => void;
  onClearTea?: () => void;
  /** e.g. "/tea/new?returnTo=/note/new" or "/tea/new?returnTo=/note/42/edit" */
  newTeaBasePath: string;
  /** 'overlay' (default): fixed positioned dropdown. 'inline': static list below input */
  variant?: 'overlay' | 'inline';
  /** Show full list when search query is empty (used in Cellar pages) */
  showAllWhenEmpty?: boolean;
  /** Show loading spinner while tea list is loading */
  isLoading?: boolean;
  /** Label text (default: "차 선택") */
  label?: string;
}

export function TeaSearchSection({
  inputRef,
  searchQuery,
  onSearchChange,
  selectedTea,
  filteredTeas,
  selectedTeaData,
  onSelectTea,
  onClearTea,
  newTeaBasePath,
  variant = 'overlay',
  showAllWhenEmpty = false,
  isLoading = false,
  label = '차 선택',
}: TeaSearchSectionProps) {
  const navigate = useNavigate();

  const showDropdown = !selectedTea && (searchQuery ? filteredTeas.length > 0 : showAllWhenEmpty && filteredTeas.length > 0);
  const showEmpty = !selectedTea && searchQuery !== '' && filteredTeas.length === 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredTeas.length > 0 && !selectedTea) {
      e.preventDefault();
      onSelectTea(filteredTeas[0].id, filteredTeas[0].name);
    }
  };

  return (
    <section className="bg-card rounded-lg p-3">
      <Label className="mb-1.5 block text-sm">{label}</Label>

      {selectedTeaData ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-medium text-foreground truncate">{selectedTeaData.name}</span>
            {selectedTeaData.type && (
              <span className="text-muted-foreground shrink-0">· {selectedTeaData.type}</span>
            )}
            {selectedTeaData.year && (
              <span className="text-muted-foreground shrink-0">· {selectedTeaData.year}년</span>
            )}
            {selectedTeaData.seller && (
              <Link
                to={`/teahouse/${encodeURIComponent(selectedTeaData.seller)}`}
                className="text-primary hover:underline shrink-0 truncate"
              >
                · {selectedTeaData.seller}
              </Link>
            )}
          </div>
          {onClearTea && (
            <button
              type="button"
              onClick={onClearTea}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="선택 해제"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Input
                ref={inputRef}
                type="text"
                placeholder="차 이름으로 검색..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              {showDropdown && variant === 'overlay' && (
                <div
                  className="fixed z-50 w-[calc(100%-2rem)] max-w-md bg-card border border-border rounded-lg shadow-lg divide-y divide-border max-h-48 overflow-y-auto"
                  style={{
                    top: `${inputRef.current ? inputRef.current.getBoundingClientRect().bottom + 8 : 0}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {filteredTeas.map((tea) => (
                    <button
                      key={tea.id}
                      onClick={() => onSelectTea(tea.id, tea.name)}
                      className="w-full text-left p-3 hover:bg-muted/50 transition-colors min-h-[44px]"
                    >
                      <p className="text-sm">{tea.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        {tea.type && <TeaTypeBadge type={tea.type} />}
                        {tea.year && ` · ${tea.year}년`}
                        {tea.seller && ` · ${tea.seller}`}
                        {tea.price != null && tea.price > 0 && ` · ${tea.price.toLocaleString()}원${tea.weight != null && tea.weight > 0 ? ` · ${tea.weight}g` : ''}`}
                        {!tea.year && !tea.seller && !(tea.price != null && tea.price > 0) && ' · 구매처 미상'}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && variant === 'inline' && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border bg-card">
                  {filteredTeas.map((tea) => (
                    <button
                      key={tea.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors"
                      onClick={() => onSelectTea(tea.id, tea.name)}
                    >
                      <p className="text-sm font-medium">{tea.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        {tea.type && <TeaTypeBadge type={tea.type} />}
                        {tea.year && ` · ${tea.year}년`}
                        {tea.seller && ` · ${tea.seller}`}
                        {tea.price != null && tea.price > 0 && ` · ${tea.price.toLocaleString()}원${tea.weight != null && tea.weight > 0 ? ` · ${tea.weight}g` : ''}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {showEmpty && (
                <div className="mt-2 py-3 px-4 border border-dashed border-border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    &quot;{searchQuery}&quot;에 대한 검색 결과가 없습니다.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate(`${newTeaBasePath}&searchQuery=${encodeURIComponent(searchQuery)}`);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    새 차로 등록하기
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
