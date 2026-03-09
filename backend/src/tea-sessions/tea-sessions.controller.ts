import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeaSessionsService } from './tea-sessions.service';
import { CreateTeaSessionDto } from './dto/create-tea-session.dto';
import { CreateSessionSteepDto } from './dto/create-session-steep.dto';
import { UpdateSessionSteepDto } from './dto/update-session-steep.dto';
import { PublishSessionToNoteDto } from './dto/publish-session-to-note.dto';
import { UserId } from '../auth/decorators/user-id.decorator';

@Controller('tea-sessions')
@UseGuards(AuthGuard('jwt'))
export class TeaSessionsController {
  constructor(private readonly teaSessionsService: TeaSessionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@UserId() userId: number, @Body() dto: CreateTeaSessionDto) {
    return this.teaSessionsService.create(userId, dto);
  }

  @Get()
  findAll(
    @UserId() userId: number,
    @Query('teaId') teaId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const teaIdNum = teaId ? this.parseId(teaId, 'teaId') : undefined;
    return this.teaSessionsService.findAll(userId, teaIdNum, from, to);
  }

  @Get(':id')
  findOne(@UserId() userId: number, @Param('id') id: string) {
    const sessionId = this.parseId(id, 'id');
    return this.teaSessionsService.findOne(userId, sessionId);
  }

  @Post(':id/steeps')
  @HttpCode(HttpStatus.CREATED)
  addSteep(
    @UserId() userId: number,
    @Param('id') id: string,
    @Body() dto: CreateSessionSteepDto,
  ) {
    const sessionId = this.parseId(id, 'id');
    return this.teaSessionsService.addSteep(userId, sessionId, dto);
  }

  @Patch(':id/steeps/:steepId')
  updateSteep(
    @UserId() userId: number,
    @Param('id') id: string,
    @Param('steepId') steepIdStr: string,
    @Body() dto: UpdateSessionSteepDto,
  ) {
    const sessionId = this.parseId(id, 'id');
    const steepId = this.parseId(steepIdStr, 'steepId');
    return this.teaSessionsService.updateSteep(userId, sessionId, steepId, dto);
  }

  @Delete(':id/steeps/:steepId')
  @HttpCode(HttpStatus.OK)
  async deleteSteep(
    @UserId() userId: number,
    @Param('id') id: string,
    @Param('steepId') steepIdStr: string,
  ) {
    const sessionId = this.parseId(id, 'id');
    const steepId = this.parseId(steepIdStr, 'steepId');
    await this.teaSessionsService.deleteSteep(userId, sessionId, steepId);
    return { message: '탕 기록이 삭제되었습니다.' };
  }

  @Post(':id/publish')
  publish(
    @UserId() userId: number,
    @Param('id') id: string,
    @Body() dto: PublishSessionToNoteDto,
  ) {
    const sessionId = this.parseId(id, 'id');
    return this.teaSessionsService.publish(userId, sessionId, dto);
  }

  private parseId(value: string, field: string): number {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException(`유효하지 않은 ${field}입니다.`);
    }
    return parsed;
  }
}
