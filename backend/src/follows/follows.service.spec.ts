import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { Follow } from './entities/follow.entity';
import { User } from '../users/entities/user.entity';

const createMockUser = (overrides?: Partial<User>): User =>
  ({
    id: 1,
    name: '테스트 사용자',
    profileImageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as User;

const createMockFollow = (overrides?: Partial<Follow>): Follow =>
  ({
    id: 1,
    followerId: 1,
    followingId: 2,
    createdAt: new Date(),
    ...overrides,
  }) as Follow;

describe('FollowsService', () => {
  let service: FollowsService;
  let followsRepository: Repository<Follow>;
  let usersRepository: Repository<User>;

  const mockFollowsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        { provide: getRepositoryToken(Follow), useValue: mockFollowsRepository },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<FollowsService>(FollowsService);
    followsRepository = module.get<Repository<Follow>>(getRepositoryToken(Follow));
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  describe('toggle', () => {
    it('자기 자신은 팔로우할 수 없어야 한다', async () => {
      const result = await service.toggle(1, 1);
      expect(result).toEqual({ isFollowing: false });
      expect(mockUsersRepository.findOne).not.toHaveBeenCalled();
    });

    it('존재하지 않는 사용자를 팔로우하면 NotFoundException을 던진다', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      await expect(service.toggle(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('팔로우하지 않은 상태에서 toggle하면 팔로우된다', async () => {
      const targetUser = createMockUser({ id: 2 });
      const newFollow = createMockFollow({ followerId: 1, followingId: 2 });

      mockUsersRepository.findOne.mockResolvedValue(targetUser);
      mockFollowsRepository.findOne.mockResolvedValue(null);
      mockFollowsRepository.create.mockReturnValue(newFollow);
      mockFollowsRepository.save.mockResolvedValue(newFollow);

      const result = await service.toggle(1, 2);

      expect(result).toEqual({ isFollowing: true });
      expect(mockFollowsRepository.create).toHaveBeenCalledWith({ followerId: 1, followingId: 2 });
      expect(mockFollowsRepository.save).toHaveBeenCalledWith(newFollow);
    });

    it('팔로우 중인 상태에서 toggle하면 언팔로우된다', async () => {
      const targetUser = createMockUser({ id: 2 });
      const existingFollow = createMockFollow({ followerId: 1, followingId: 2 });

      mockUsersRepository.findOne.mockResolvedValue(targetUser);
      mockFollowsRepository.findOne.mockResolvedValue(existingFollow);
      mockFollowsRepository.remove.mockResolvedValue(undefined);

      const result = await service.toggle(1, 2);

      expect(result).toEqual({ isFollowing: false });
      expect(mockFollowsRepository.remove).toHaveBeenCalledWith(existingFollow);
    });
  });

  describe('isFollowing', () => {
    it('followerId 또는 followingId가 없으면 false를 반환한다', async () => {
      expect(await service.isFollowing(0, 2)).toBe(false);
      expect(await service.isFollowing(1, 0)).toBe(false);
    });

    it('팔로우 관계가 있으면 true를 반환한다', async () => {
      mockFollowsRepository.findOne.mockResolvedValue(createMockFollow());
      expect(await service.isFollowing(1, 2)).toBe(true);
    });

    it('팔로우 관계가 없으면 false를 반환한다', async () => {
      mockFollowsRepository.findOne.mockResolvedValue(null);
      expect(await service.isFollowing(1, 2)).toBe(false);
    });
  });

  describe('getFollowerCount / getFollowingCount', () => {
    it('팔로워 수를 반환한다', async () => {
      mockFollowsRepository.count.mockResolvedValue(5);
      expect(await service.getFollowerCount(2)).toBe(5);
      expect(mockFollowsRepository.count).toHaveBeenCalledWith({ where: { followingId: 2 } });
    });

    it('팔로잉 수를 반환한다', async () => {
      mockFollowsRepository.count.mockResolvedValue(3);
      expect(await service.getFollowingCount(1)).toBe(3);
      expect(mockFollowsRepository.count).toHaveBeenCalledWith({ where: { followerId: 1 } });
    });
  });

  describe('getFollowingIds', () => {
    it('팔로잉 중인 유저 ID 목록을 반환한다', async () => {
      mockFollowsRepository.find.mockResolvedValue([
        createMockFollow({ followerId: 1, followingId: 2 }),
        createMockFollow({ followerId: 1, followingId: 3 }),
      ]);

      const ids = await service.getFollowingIds(1);
      expect(ids).toEqual([2, 3]);
    });

    it('팔로잉 중인 유저가 없으면 빈 배열을 반환한다', async () => {
      mockFollowsRepository.find.mockResolvedValue([]);
      const ids = await service.getFollowingIds(1);
      expect(ids).toEqual([]);
    });
  });

  describe('getFollowers / getFollowing', () => {
    it('팔로워 목록을 반환한다', async () => {
      const followerUser = createMockUser({ id: 3 });
      mockFollowsRepository.find.mockResolvedValue([
        { ...createMockFollow({ followerId: 3, followingId: 1 }), follower: followerUser },
      ]);

      const followers = await service.getFollowers(1);
      expect(followers).toHaveLength(1);
      expect(followers[0].id).toBe(3);
    });

    it('팔로잉 목록을 반환한다', async () => {
      const followingUser = createMockUser({ id: 2 });
      mockFollowsRepository.find.mockResolvedValue([
        { ...createMockFollow({ followerId: 1, followingId: 2 }), following: followingUser },
      ]);

      const following = await service.getFollowing(1);
      expect(following).toHaveLength(1);
      expect(following[0].id).toBe(2);
    });
  });
});
