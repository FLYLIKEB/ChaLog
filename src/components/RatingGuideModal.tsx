import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

const DEFAULT_AXES = [
  { name: '풍부함', desc: '농축된 맛과 향의 정도' },
  { name: '강도', desc: '맛의 농도와 셉시' },
  { name: '부드러움', desc: '목 넘김, 떫음 정도' },
  { name: '명확함', desc: '맛과 향이 선명한 정도' },
  { name: '복잡성', desc: '다층적 풍미, 변화' },
];

interface RatingGuideModalProps {
  /** DialogTrigger asChild용 단일 React element (문자열/배열/Fragment 불가) */
  trigger?: React.ReactElement;
  children?: React.ReactNode;
  /** 현재 스키마의 축 이름 목록. 있으면 해당 축 표시, 없으면 기본 5축 */
  schemaAxes?: string[];
}

export function RatingGuideModal({ trigger, children, schemaAxes }: RatingGuideModalProps) {
  const axesToShow = schemaAxes?.length
    ? schemaAxes.map((name) => ({ name, desc: '축 옆 (i) 아이콘에서 상세 설명을 볼 수 있어요.' }))
    : DEFAULT_AXES;
  const heading = schemaAxes?.length ? '평가 축 예시' : '기본 축 예시';

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground h-auto py-1 px-2 text-xs"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            평가 가이드 보기
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>차록 평가 가이드</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <section>
            <h4 className="font-medium text-foreground mb-1">평가 팁</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>같은 온도·시간에서 비교하면 일관된 평가가 가능해요</li>
              <li>첫 향, 본 맛, 여운을 구분해서 느껴보세요</li>
              <li>축별 점수 옆 (i) 아이콘을 누르면 각 항목 설명을 볼 수 있어요</li>
            </ul>
          </section>
          <section>
            <h4 className="font-medium text-foreground mb-1">{heading}</h4>
            <ul className="space-y-1 text-xs">
              {axesToShow.map(({ name, desc }) => (
                <li key={name}><strong>{name}</strong>: {desc}</li>
              ))}
            </ul>
          </section>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
