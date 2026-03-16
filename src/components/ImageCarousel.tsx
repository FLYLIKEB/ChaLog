import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { cn } from './ui/utils';

interface ImageCarouselProps {
  images: string[];
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, images.length - 1)));
  }, [images.length]);

  // Touch (touch-action: pan-y handles vertical scroll, we handle horizontal)
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = startX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 30) {
      goTo(diff > 0 ? currentIndex + 1 : currentIndex - 1);
    }
  };

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    isDragging.current = true;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = startX.current - e.clientX;
    if (Math.abs(diff) > 40) {
      goTo(diff > 0 ? currentIndex + 1 : currentIndex - 1);
    }
  };
  const handleMouseLeave = () => {
    isDragging.current = false;
  };

  if (images.length === 1) {
    return (
      <div className="bg-muted/20 dark:bg-muted/10 flex justify-center py-3">
        <div className="w-1/2 aspect-[3/4] rounded-xl overflow-hidden">
          <ImageWithFallback
            src={images[0]}
            alt="사진"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/20 dark:bg-muted/10">
      {/* Carousel */}
      <div
        className="relative overflow-hidden select-none cursor-grab active:cursor-grabbing group"
        style={{ touchAction: 'pan-y pinch-zoom' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((imageUrl, index) => (
            <div key={index} className="w-full shrink-0 flex items-center justify-center py-3">
              <div className="w-1/2 aspect-[3/4] rounded-xl overflow-hidden">
                <ImageWithFallback
                  src={imageUrl}
                  alt={`사진 ${index + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Left/Right arrows */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={() => goTo(currentIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="이전 사진"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentIndex < images.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(currentIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="다음 사진"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Counter */}
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-[11px] font-medium">
          {currentIndex + 1}/{images.length}
        </span>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 py-2.5">
        {images.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goTo(index)}
            className={cn(
              'rounded-full transition-all duration-200',
              index === currentIndex
                ? 'bg-primary w-2 h-2'
                : 'bg-muted-foreground/30 w-1.5 h-1.5',
            )}
            aria-label={`사진 ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
