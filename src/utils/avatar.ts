/**
 * 사용자 이름을 기반으로 일관된 그라데이션 색상을 생성하는 유틸리티
 * 같은 이름은 항상 같은 색상을 반환합니다.
 */

// 현대적이고 세련된 그라데이션 색상 팔레트 (진한 톤으로 텍스트 가독성 향상)
const GRADIENT_PAIRS = [
  { from: 'from-emerald-500', to: 'to-teal-600' }, // 초록-청록
  { from: 'from-blue-500', to: 'to-cyan-600' }, // 파랑-청록
  { from: 'from-purple-500', to: 'to-pink-600' }, // 보라-핑크
  { from: 'from-orange-500', to: 'to-red-600' }, // 주황-빨강
  { from: 'from-indigo-500', to: 'to-purple-600' }, // 남색-보라
  { from: 'from-rose-500', to: 'to-pink-600' }, // 장미-핑크
  { from: 'from-amber-500', to: 'to-orange-600' }, // 호박-주황
  { from: 'from-violet-500', to: 'to-purple-600' }, // 바이올렛-보라
  { from: 'from-sky-500', to: 'to-blue-600' }, // 하늘-파랑
  { from: 'from-lime-500', to: 'to-green-600' }, // 라임-초록
  { from: 'from-fuchsia-500', to: 'to-pink-600' }, // 푸크시아-핑크
  { from: 'from-emerald-600', to: 'to-teal-700' }, // 진한 초록
];

/**
 * 문자열을 간단한 해시값으로 변환
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit 정수로 변환
  }
  return Math.abs(hash);
}

/**
 * 사용자 이름을 기반으로 그라데이션 클래스를 반환
 */
export function getAvatarGradient(name: string): { from: string; to: string } {
  const hash = simpleHash(name);
  const index = hash % GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[index];
}

/**
 * 사용자 이름을 기반으로 텍스트 색상을 반환
 * 그라데이션 배경에 잘 보이도록 항상 흰색 반환
 */
export function getAvatarTextColor(name: string): string {
  return 'text-white';
}

