/**
 * 하단 네비게이션 바 높이만큼 여백을 추가하는 공통 컴포넌트.
 * 스크롤 끝에서 콘텐츠가 BottomNav에 가려지지 않도록 사용.
 */
export function BottomNavSpacer() {
  return (
    <div
      className="shrink-0 w-full"
      style={{
        height: 'var(--bottom-nav-spacer)',
        minHeight: 'var(--bottom-nav-spacer)',
      }}
      aria-hidden
    />
  );
}
