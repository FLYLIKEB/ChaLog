import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private followsRepository: Repository<Follow>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async toggle(followerId: number, followingId: number): Promise<{ isFollowing: boolean }> {
    if (followerId === followingId) {
      return { isFollowing: false };
    }

    const target = await this.usersRepository.findOne({ where: { id: followingId } });
    if (!target) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // Atomic insert: absorb duplicate-key errors instead of findOne→save (TOCTOU race)
    try {
      await this.followsRepository
        .createQueryBuilder()
        .insert()
        .into(Follow)
        .values({ followerId, followingId })
        .execute();
      return { isFollowing: true };
    } catch (error) {
      // Duplicate key → row already exists, so delete (unfollow)
      const isDuplicate =
        error instanceof QueryFailedError &&
        ((error as any).code === 'ER_DUP_ENTRY' || (error as any).code === '23505');
      if (!isDuplicate) throw error;
    }

    await this.followsRepository
      .createQueryBuilder()
      .delete()
      .from(Follow)
      .where('followerId = :followerId AND followingId = :followingId', { followerId, followingId })
      .execute();
    return { isFollowing: false };
  }

  async getFollowerCount(userId: number): Promise<number> {
    return this.followsRepository.count({ where: { followingId: userId } });
  }

  async getFollowingCount(userId: number): Promise<number> {
    return this.followsRepository.count({ where: { followerId: userId } });
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    if (!followerId || !followingId) return false;
    const follow = await this.followsRepository.findOne({
      where: { followerId, followingId },
    });
    return !!follow;
  }

  async getFollowers(userId: number): Promise<User[]> {
    const follows = await this.followsRepository.find({
      where: { followingId: userId },
      relations: ['follower'],
    });
    return follows.map((f) => f.follower);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const follows = await this.followsRepository.find({
      where: { followerId: userId },
      relations: ['following'],
    });
    return follows.map((f) => f.following);
  }

  async getFollowingIds(userId: number): Promise<number[]> {
    const follows = await this.followsRepository.find({
      where: { followerId: userId },
      select: ['followingId'],
    });
    return follows.map((f) => f.followingId);
  }
}
