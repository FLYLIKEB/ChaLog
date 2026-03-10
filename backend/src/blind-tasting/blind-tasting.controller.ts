import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BlindTastingService } from './blind-tasting.service';
import { CreateBlindSessionDto } from './dto/create-blind-session.dto';
import { JoinBlindSessionDto } from './dto/join-blind-session.dto';
import { SubmitBlindNoteDto } from './dto/submit-blind-note.dto';
import { UserId } from '../auth/decorators/user-id.decorator';

@Controller('blind-sessions')
@UseGuards(AuthGuard('jwt'))
export class BlindTastingController {
  constructor(private readonly blindTastingService: BlindTastingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@UserId() userId: number, @Body() dto: CreateBlindSessionDto) {
    return this.blindTastingService.create(userId, dto);
  }

  @Get('join/:inviteCode')
  getByInviteCode(@Param('inviteCode') inviteCode: string) {
    return this.blindTastingService.getSessionByInviteCode(inviteCode);
  }

  @Post('join')
  @HttpCode(HttpStatus.CREATED)
  join(@UserId() userId: number, @Body() dto: JoinBlindSessionDto) {
    return this.blindTastingService.join(userId, dto.inviteCode);
  }

  @Get(':id')
  getSession(@UserId() userId: number, @Param('id') id: string) {
    const sessionId = this.parseId(id, 'id');
    return this.blindTastingService.getSession(userId, sessionId);
  }

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  submitNote(
    @UserId() userId: number,
    @Param('id') id: string,
    @Body() dto: SubmitBlindNoteDto,
  ) {
    const sessionId = this.parseId(id, 'id');
    return this.blindTastingService.submitNote(userId, sessionId, dto);
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  endSession(@UserId() userId: number, @Param('id') id: string) {
    const sessionId = this.parseId(id, 'id');
    return this.blindTastingService.endSession(userId, sessionId);
  }

  @Get(':id/report')
  getReport(@UserId() userId: number, @Param('id') id: string) {
    const sessionId = this.parseId(id, 'id');
    return this.blindTastingService.getComparisonReport(userId, sessionId);
  }

  private parseId(value: string, field: string): number {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException(`유효하지 않은 ${field}입니다.`);
    }
    return parsed;
  }
}
