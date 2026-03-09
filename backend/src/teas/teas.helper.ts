import { Seller } from './entities/seller.entity';

/** Tea 엔티티를 API 응답 형태로 변환 (seller를 sellerName 문자열로) */
export function mapTeaToResponse<T extends { seller?: Seller | null | string }>(
  tea: T,
): Omit<T, 'seller'> & { seller: string | null } {
  if (!tea) return tea as Omit<T, 'seller'> & { seller: string | null };
  const sellerName =
    typeof tea.seller === 'string' ? tea.seller : tea.seller?.name ?? null;
  const { seller, ...rest } = tea;
  return { ...rest, seller: sellerName } as Omit<T, 'seller'> & {
    seller: string | null;
  };
}
