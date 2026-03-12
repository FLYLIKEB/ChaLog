import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  UseGuards,
  Post,
  Patch,
  Body,
  Delete,
  UseInterceptors,
  UploadedFile,
  Request,
  InternalServerErrorException,
  Logger,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { UserLevelService } from './user-level.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { AuthGuard } from '@nestjs/passport';
import { ImageUploadService } from '../common/storage/image-upload.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { FollowsService } from '../follows/follows.service';
import { ValidatedUserId } from '../common/decorators/validated-user-id.decorator';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly userLevelService: UserLevelService,
    private readonly imageUploadService: ImageUploadService,
    private readonly followsService: FollowsService,
  ) {}

  @Get('trending')
  getTrending(@Query('period') period?: string) {
    const p = period === '30d' ? '30d' : '7d';
    return this.usersService.getTrendingCreators(p);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req?) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }

    const currentUserId: number | undefined = req?.user?.userId
      ? parseInt(req.user.userId, 10)
      : undefined;

    const user = await this.usersService.findOne(parsedId);

    if (!user.isProfilePublic && currentUserId !== parsedId) {
      throw new ForbiddenException('비공개 프로필입니다.');
    }

    const [followerCount, followingCount, isFollowing] = await Promise.all([
      this.followsService.getFollowerCount(parsedId),
      this.followsService.getFollowingCount(parsedId),
      currentUserId ? this.followsService.isFollowing(currentUserId, parsedId) : Promise.resolve(false),
    ]);

    return { ...user, followerCount, followingCount, isFollowing };
  }

  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  @Post(':id/follow')
  async toggleFollow(@Param('id') id: string, @ValidatedUserId() userId: number) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    return this.usersService.toggleFollow(userId, parsedId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/followers')
  async getFollowers(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    return this.followsService.getFollowers(parsedId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/following')
  async getFollowing(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    return this.followsService.getFollowing(parsedId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadProfileImage(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    try {
      const url = await this.imageUploadService.uploadProfileImage(file);
      return { url };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('프로필 이미지 업로드 실패:', error instanceof Error ? error.message : error);
      throw new InternalServerErrorException('이미지 업로드 중 오류가 발생했습니다.');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @ValidatedUserId() userId: number, @Body() updateUserDto: UpdateUserDto) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    return this.usersService.update(parsedId, userId, updateUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/onboarding')
  async getOnboardingPreference(@Param('id') id: string, @ValidatedUserId() userId: number) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (parsedId !== userId) {
      throw new ForbiddenException('이 온보딩 정보를 조회할 권한이 없습니다.');
    }
    return this.usersService.getOnboardingPreference(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/onboarding')
  async updateOnboardingPreference(
    @Param('id') id: string,
    @ValidatedUserId() userId: number,
    @Body() updateOnboardingDto: UpdateOnboardingDto,
  ) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (parsedId !== userId) {
      throw new ForbiddenException('이 온보딩 정보를 수정할 권한이 없습니다.');
    }
    return this.usersService.updateOnboardingPreference(userId, updateOnboardingDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/authentications')
  async getLinkedAccounts(@Param('id') id: string, @ValidatedUserId() userId: number) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (parsedId !== userId) {
      throw new ForbiddenException('이 연동 계정 정보를 조회할 권한이 없습니다.');
    }
    return this.usersService.getLinkedAccounts(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/authentications/:authId')
  @HttpCode(204)
  async unlinkAccount(
    @Param('id') id: string,
    @Param('authId') authId: string,
    @ValidatedUserId() userId: number,
  ) {
    const parsedId = parseInt(id, 10);
    const parsedAuthId = parseInt(authId, 10);

    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedAuthId)) {
      throw new BadRequestException('Invalid authId');
    }
    if (parsedId !== userId) {
      throw new ForbiddenException('이 연동 계정을 해제할 권한이 없습니다.');
    }

    await this.usersService.unlinkAccount(userId, parsedAuthId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/notification-settings')
  async getNotificationSetting(@Param('id') id: string, @ValidatedUserId() userId: number) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (parsedId !== userId) {
      throw new ForbiddenException('이 알림 설정을 조회할 권한이 없습니다.');
    }
    return this.usersService.getNotificationSetting(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/notification-settings')
  async updateNotificationSetting(
    @Param('id') id: string,
    @ValidatedUserId() userId: number,
    @Body() dto: UpdateNotificationSettingDto,
  ) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (parsedId !== userId) {
      throw new ForbiddenException('이 알림 설정을 수정할 권한이 없습니다.');
    }
    return this.usersService.updateNotificationSetting(userId, dto);
  }

  @Get('me/level')
  @UseGuards(AuthGuard('jwt'))
  getMyLevel(@Request() req: any) {
    const userId = parseInt(req.user.userId, 10);
    return this.userLevelService.getUserLevel(userId);
  }

  @Get(':id/level')
  @UseGuards(OptionalJwtAuthGuard)
  getUserLevel(@Param('id') id: string) {
    return this.userLevelService.getUserLevel(parseInt(id, 10));
  }
}
