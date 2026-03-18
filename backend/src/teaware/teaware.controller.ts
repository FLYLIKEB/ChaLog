import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeawareService } from './teaware.service';
import { CreateTeawareDto } from './dto/create-teaware.dto';
import { UpdateTeawareDto } from './dto/update-teaware.dto';

@Controller('teaware')
@UseGuards(AuthGuard('jwt'))
export class TeawareController {
  constructor(private readonly teawareService: TeawareService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(@Request() req: any, @Body() dto: CreateTeawareDto) {
    const userId = this.parseUserId(req);
    return this.teawareService.create(userId, dto);
  }

  @Get()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findAll(@Request() req: any) {
    const userId = this.parseUserId(req);
    return this.teawareService.findAll(userId);
  }

  @Get(':id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findOne(@Request() req: any, @Param('id') id: string) {
    const userId = this.parseUserId(req);
    const itemId = this.parseId(id);
    return this.teawareService.findOne(itemId, userId);
  }

  @Patch(':id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTeawareDto) {
    const userId = this.parseUserId(req);
    const itemId = this.parseId(id);
    return this.teawareService.update(itemId, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async remove(@Request() req: any, @Param('id') id: string) {
    const userId = this.parseUserId(req);
    const itemId = this.parseId(id);
    await this.teawareService.remove(itemId, userId);
    return { message: '다구가 삭제되었습니다.' };
  }

  @Patch(':id/pin')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  togglePin(@Request() req: any, @Param('id') id: string) {
    const userId = this.parseUserId(req);
    const itemId = this.parseId(id);
    return this.teawareService.togglePin(itemId, userId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseUserId(req: any): number {
    const parsed = parseInt(req.user?.userId, 10);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    return parsed;
  }

  private parseId(id: string): number {
    const parsed = parseInt(id, 10);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException('유효하지 않은 ID입니다.');
    }
    return parsed;
  }
}
