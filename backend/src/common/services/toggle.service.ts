import { Injectable } from '@nestjs/common';
import { Repository, ObjectLiteral, FindOptionsWhere, DeepPartial } from 'typeorm';

@Injectable()
export class ToggleService {
  async toggle<T extends ObjectLiteral>(
    repository: Repository<T>,
    conditions: FindOptionsWhere<T>,
  ): Promise<{ isActive: boolean }> {
    const existing = await repository.findOne({ where: conditions });
    if (existing) {
      await repository.delete(conditions);
      return { isActive: false };
    } else {
      await repository.save(repository.create(conditions as unknown as DeepPartial<T>));
      return { isActive: true };
    }
  }
}
