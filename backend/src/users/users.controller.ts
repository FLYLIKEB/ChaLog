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
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { AuthGuard } from '@nestjs/passport';
import { S3Service } from '../common/storage/s3.service';
import { ImageProcessorService } from '../common/storage/image-processor.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { FollowsService } from '../follows/follows.service';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
    private readonly imageProcessorService: ImageProcessorService,
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
  async toggleFollow(@Param('id') id: string, @Request() req) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(req.user.userId, 10);

    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    return this.usersService.toggleFollow(parsedUserId, parsedId);
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

    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    // 파일 타입 검증
    if (!this.imageProcessorService.validateImageType(file.mimetype)) {
      throw new BadRequestException('지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP만 지원합니다.');
    }

    // 파일 크기 검증
    if (!this.imageProcessorService.validateImageSize(file.size)) {
      throw new BadRequestException('파일 크기는 10MB를 초과할 수 없습니다.');
    }

    try {
      // 이미지 처리 (리사이징, 최적화)
      const processedBuffer = await this.imageProcessorService.processImage(
        file.buffer,
        file.mimetype,
      );

      // S3에 업로드 (prefix를 'profiles'로 설정)
      const key = this.s3Service.generateKey('profiles', file.originalname, file.mimetype);
      const url = await this.s3Service.uploadFile(key, processedBuffer, file.mimetype);

      return { url };
    } catch (error) {
      // 사용자 입력 오류(파일 형식, 크기)는 이미 위에서 처리됨
      // S3 또는 이미지 처리 서버 오류는 500으로 처리
      if (error instanceof BadRequestException) {
        throw error;
      }
      // 내부 오류 상세 정보는 로깅하고, 클라이언트에는 일반적인 메시지만 반환
      this.logger.error('프로필 이미지 업로드 실패:', error instanceof Error ? error.message : error);
      throw new InternalServerErrorException('이미지 업로드 중 오류가 발생했습니다.');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateUserDto: UpdateUserDto) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    
    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(req.user.userId, 10);
    
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    
    return this.usersService.update(parsedId, parsedUserId, updateUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/onboarding')
  async getOnboardingPreference(@Param('id') id: string, @Request() req) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(req.user.userId, 10);

    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    if (parsedId !== parsedUserId) {
      throw new ForbiddenException('이 온보딩 정보를 조회할 권한이 없습니다.');
    }

    return this.usersService.getOnboardingPreference(parsedUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/onboarding')
  async updateOnboardingPreference(
    @Param('id') id: string,
    @Request() req,
    @Body() updateOnboardingDto: UpdateOnboardingDto,
  ) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(req.user.userId, 10);

    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    if (parsedId !== parsedUserId) {
      throw new ForbiddenException('이 온보딩 정보를 수정할 권한이 없습니다.');
    }

    return this.usersService.updateOnboardingPreference(parsedUserId, updateOnboardingDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/authentications')
  async getLinkedAccounts(@Param('id') id: string, @Request() req) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(req.user.userId, 10);

    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    if (parsedId !== parsedUserId) {
      throw new ForbiddenException('이 연동 계정 정보를 조회할 권한이 없습니다.');
    }

    return this.usersService.getLinkedAccounts(parsedUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/authentications/:authId')
  @HttpCode(204)
  async unlinkAccount(
    @Param('id') id: string,
    @Param('authId') authId: string,
    @Request() req,
  ) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    const parsedId = parseInt(id, 10);
    const parsedAuthId = parseInt(authId, 10);
    const parsedUserId = parseInt(req.user.userId, 10);

    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedAuthId)) {
      throw new BadRequestException('Invalid authId');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    if (parsedId !== parsedUserId) {
      throw new ForbiddenException('이 연동 계정을 해제할 권한이 없습니다.');
    }

    await this.usersService.unlinkAccount(parsedUserId, parsedAuthId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/notification-settings')
  async getNotificationSetting(@Param('id') id: string, @Request() req) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(req.user.userId, 10);

    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    if (parsedId !== parsedUserId) {
      throw new ForbiddenException('이 알림 설정을 조회할 권한이 없습니다.');
    }

    return this.usersService.getNotificationSetting(parsedUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/notification-settings')
  async updateNotificationSetting(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateNotificationSettingDto,
  ) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(req.user.userId, 10);

    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    if (parsedId !== parsedUserId) {
      throw new ForbiddenException('이 알림 설정을 수정할 권한이 없습니다.');
    }

    return this.usersService.updateNotificationSetting(parsedUserId, dto);
  }
}
