export class PaginationHelper {
  static normalize(page?: number, limit?: number, maxLimit = 100) {
    const take = Math.min(maxLimit, Math.max(1, limit ?? 20));
    const skip = Math.max(0, ((page ?? 1) - 1) * take);
    return { take, skip };
  }
}
