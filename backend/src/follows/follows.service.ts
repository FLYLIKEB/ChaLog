import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    const existing = await this.followsRepository.findOne({
      where: { followerId, followingId },
    });

    if (existing) {
      await this.followsRepository.remove(existing);
      return { isFollowing: false };
    }

    const follow = this.followsRepository.create({ followerId, followingId });
    await this.followsRepository.save(follow);
    return { isFollowing: true };
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
