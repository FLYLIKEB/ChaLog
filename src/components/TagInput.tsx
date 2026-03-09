import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RECOMMENDED_NOTE_TAGS } from '../constants';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
}

export function TagInput({ tags, onChange, maxTags = 10 }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 입력값에 따라 추천 태그 필터링
  const filteredSuggestions = useMemo(() => {
    const normalizedInput = inputValue.trim().replace(/\s+/g, '').toLowerCase();
    return RECOMMENDED_NOTE_TAGS.filter((tag) => {
      if (tags.includes(tag)) {
        return false;
      }
      if (!normalizedInput) {
        return true;
      }
      const normalizedTag = tag.replace(/\s+/g, '').toLowerCase();
      return normalizedTag.includes(normalizedInput);
    });
  }, [inputValue, tags]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 한글 입력 중(조합 중)일 때는 Enter 키를 무시
    if (isComposing && e.key === 'Enter') {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      // 중복 처리 방지
      if (isProcessing) {
        return;
      }
      
      // 이벤트에서 직접 최신 값을 가져오기 (상태 업데이트 지연 방지)
      const currentValue = (e.target as HTMLInputElement).value.trim();
      
      if (currentValue) {
        setIsProcessing(true);
        addTag(currentValue);
        // 입력 필드를 즉시 비우기
        (e.target as HTMLInputElement).value = '';
        setInputValue('');
        
        // 처리 완료 후 플래그 해제
        setTimeout(() => {
          setIsProcessing(false);
        }, 100);
      }
    } else if (e.key === 'Backspace') {
      const currentValue = (e.target as HTMLInputElement).value;
      if (!currentValue && tags.length > 0) {
        // 빈 입력 상태에서 Backspace 누르면 마지막 태그 제거
        e.preventDefault();
        removeTag(tags.length - 1);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  const addTag = (tag: string) => {
    // 공백 제거 및 검증
    const trimmedTag = tag.trim();
    if (!trimmedTag || trimmedTag.length === 0) {
      return;
    }
    
    // 중복 체크
    if (tags.includes(trimmedTag)) {
      return;
    }
    
    // 최대 개수 체크
    if (tags.length >= maxTags) {
      return;
    }
    
    // 태그 추가
    onChange([...tags, trimmedTag]);
    setInputValue('');
    
    // 입력 필드에 포커스 유지
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus();
      }
    }, 0);
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleSuggestionClick = (tag: string) => {
    addTag(tag);
  };

  return (
    <div
      ref={containerRef}
      className="space-y-2"
    >
      <Label>향미</Label>

      {/* 맞춤차 향미 - 항상 위에 표시 */}
      <div className="rounded-lg border border-border/60 bg-muted/30 p-2">
        <p className="text-xs text-muted-foreground mb-2 px-1">맞춤차 향미</p>
        <div className="flex flex-wrap gap-2">
          {filteredSuggestions.slice(0, 20).map((tag) => (
            <Button
              key={tag}
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[32px] h-auto py-1 px-2 text-[11px] leading-none"
              onClick={() => handleSuggestionClick(tag)}
            >
              <Plus className="w-4 h-4 mr-1" />
              {tag}
            </Button>
          ))}
        </div>
      </div>
      
      {/* 입력된 태그 표시 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                aria-label={`${tag} 향미 삭제`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* 태그 입력 필드 */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="향미를 입력하거나 맞춤차 향미를 선택하세요"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          disabled={tags.length >= maxTags}
        />

      </div>

      {/* 도움말 텍스트 */}
      <p className="text-xs text-gray-500">
        {tags.length >= maxTags
          ? `최대 ${maxTags}개까지 추가할 수 있습니다.`
          : `Enter 키로 향미를 추가하거나 맞춤차 향미를 클릭하세요. (${tags.length}/${maxTags})`}
      </p>
    </div>
  );
}

