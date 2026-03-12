import { Injectable } from '@nestjs/common';
import { Repository, ObjectLiteral } from 'typeorm';

@Injectable()
export class ToggleService {
  async toggle<T extends ObjectLiteral>(
    repository: Repository<T>,
    conditions: Partial<T>,
  ): Promise<{ isActive: boolean }> {
    const existing = await repository.findOne({ where: conditions as any });
    if (existing) {
      await repository.delete(conditions as any);
      return { isActive: false };
    } else {
      await repository.save(repository.create(conditions as any));
      return { isActive: true };
    }
  }
}
