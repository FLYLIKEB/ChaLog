import React from 'react';
import { cn } from './ui/utils';

export type BrewColor =
  | 'light-yellow'    // 연한 노란색
  | 'yellow'          // 노란색
  | 'gold'            // 황금색
  | 'amber'           // 호박색
  | 'orange'          // 주황색
  | 'light-brown'     // 연한 갈색
  | 'brown'           // 갈색
  | 'dark-brown'      // 진한 갈색
  | 'dark-red'        // 진한 적갈색
  | 'black';          // 검정

export const BREW_COLORS: {
  value: BrewColor;
  label: string;
  hex: string;
}[] = [
  { value: 'light-yellow', label: '연한 노란색', hex: '#FDFBE8' },
  { value: 'yellow',       label: '노란색',     hex: '#F9E84A' },
  { value: 'gold',         label: '황금색',     hex: '#E8B84B' },
  { value: 'amber',        label: '호박색',     hex: '#D4861C' },
  { value: 'orange',       label: '주황색',     hex: '#C06010' },
  { value: 'light-brown',  label: '연한 갈색',  hex: '#9B4F10' },
  { value: 'brown',        label: '갈색',       hex: '#7A3308' },
  { value: 'dark-brown',   label: '진한 갈색',  hex: '#4E1E04' },
  { value: 'dark-red',     label: '적흑색',     hex: '#2A0D02' },
  { value: 'black',        label: '검정',       hex: '#0A0402' },
];

const GRADIENT = BREW_COLORS.map((c) => c.hex).join(', ');

interface BrewColorPickerProps {
  value: BrewColor | null;
  onChange: (value: BrewColor | null) => void;
}

export function BrewColorPicker({ value, onChange }: BrewColorPickerProps) {
  const selectedIndex = value ? BREW_COLORS.findIndex((c) => c.value === value) : -1;
  const selectedColor = value ? BREW_COLORS.find((c) => c.value === value) : null;

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const index = Math.round(ratio * (BREW_COLORS.length - 1));
    const clicked = BREW_COLORS[index];
    if (clicked.value === value) {
      onChange(null);
    } else {
      onChange(clicked.value);
    }
  };

  const markerPercent =
    selectedIndex >= 0
      ? (selectedIndex / (BREW_COLORS.length - 1)) * 100
      : null;

  return (
    <div className="space-y-3">
      {/* 색상 바 */}
      <div className="relative">
        <div
          className="h-8 rounded-full cursor-pointer shadow-inner border border-border/30"
          style={{
            background: `linear-gradient(to right, ${GRADIENT})`,
          }}
          onClick={handleBarClick}
        />

        {/* 선택 마커 */}
        {markerPercent !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${markerPercent}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-white shadow-md ring-1 ring-black/20"
              style={{ backgroundColor: selectedColor?.hex ?? 'transparent' }}
            />
          </div>
        )}
      </div>

      {/* 색상 점 목록 */}
      <div className="flex justify-between px-0.5">
        {BREW_COLORS.map((color, i) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value === value ? null : color.value)}
            className={cn(
              'w-5 h-5 rounded-full border-2 transition-all duration-150',
              selectedIndex === i
                ? 'border-white scale-125 shadow-md ring-1 ring-black/30'
                : 'border-transparent opacity-70 hover:opacity-100 hover:scale-110'
            )}
            style={{ backgroundColor: color.hex }}
            title={color.label}
          />
        ))}
      </div>

      {/* 선택된 색상 레이블 */}
      <div className="h-5 text-center">
        {selectedColor ? (
          <span className="text-sm text-muted-foreground">
            {selectedColor.label}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/40">색상을 선택하세요</span>
        )}
      </div>
    </div>
  );
}
