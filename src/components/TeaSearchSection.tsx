import React, { RefObject } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
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
  /** e.g. "/tea/new?returnTo=/note/new" or "/tea/new?returnTo=/note/42/edit" */
  newTeaBasePath: string;
}

export function TeaSearchSection({
  inputRef,
  searchQuery,
  onSearchChange,
  selectedTea,
  filteredTeas,
  selectedTeaData,
  onSelectTea,
  newTeaBasePath,
}: TeaSearchSectionProps) {
  const navigate = useNavigate();
  return (
    <section className="bg-card rounded-lg p-3">
      <Label className="mb-1.5 block text-sm">차 선택</Label>
      <Input
        ref={inputRef}
        type="text"
        placeholder="차 이름으로 검색..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {searchQuery && !selectedTea && filteredTeas.length > 0 && (
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
                {tea.seller && ` · ${tea.seller}`}
                {tea.price != null && tea.price > 0 && ` · ${tea.price.toLocaleString()}원${tea.weight != null && tea.weight > 0 ? ` · ${tea.weight}g` : ''}`}
                {!tea.seller && !(tea.price != null && tea.price > 0) && ' · 구매처 미상'}
              </p>
            </button>
          ))}
        </div>
      )}

      {searchQuery && !selectedTea && filteredTeas.length === 0 && (
        <div className="mt-2 py-3 px-4 border border-dashed border-border rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">
            "{searchQuery}"에 대한 검색 결과가 없습니다.
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

      {selectedTeaData && (
        <div className="mt-2 py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm text-emerald-900 dark:text-emerald-100">{selectedTeaData.name}</span>
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-300 space-y-0.5">
            {selectedTeaData.year && <p>연도: {selectedTeaData.year}년</p>}
            <p>종류: {selectedTeaData.type}</p>
            {selectedTeaData.seller && (
              <p>
                구매처:{' '}
                <Link
                  to={`/teahouse/${encodeURIComponent(selectedTeaData.seller)}`}
                  className="text-primary hover:underline"
                >
                  {selectedTeaData.seller}
                </Link>
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
