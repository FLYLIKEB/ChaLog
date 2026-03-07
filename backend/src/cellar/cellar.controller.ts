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
import { CellarService } from './cellar.service';
import { CreateCellarItemDto } from './dto/create-cellar-item.dto';
import { UpdateCellarItemDto } from './dto/update-cellar-item.dto';

@Controller('cellar')
@UseGuards(AuthGuard('jwt'))
export class CellarController {
  constructor(private readonly cellarService: CellarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(@Request() req: any, @Body() dto: CreateCellarItemDto) {
    const userId = this.parseUserId(req);
    return this.cellarService.create(userId, dto);
  }

  @Get()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findAll(@Request() req: any) {
    const userId = this.parseUserId(req);
    return this.cellarService.findAll(userId);
  }

  @Get('reminders')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findReminders(@Request() req: any) {
    const userId = this.parseUserId(req);
    return this.cellarService.findReminders(userId);
  }

  @Get(':id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findOne(@Request() req: any, @Param('id') id: string) {
    const userId = this.parseUserId(req);
    const itemId = this.parseId(id);
    return this.cellarService.findOne(userId, itemId);
  }

  @Patch(':id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateCellarItemDto) {
    const userId = this.parseUserId(req);
    const itemId = this.parseId(id);
    return this.cellarService.update(userId, itemId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async remove(@Request() req: any, @Param('id') id: string) {
    const userId = this.parseUserId(req);
    const itemId = this.parseId(id);
    await this.cellarService.remove(userId, itemId);
    return { message: '셀러 아이템이 삭제되었습니다.' };
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
