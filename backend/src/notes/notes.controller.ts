import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req, @Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(parseInt(req.user.userId, 10), createNoteDto);
  }

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('public') isPublic?: string,
    @Query('teaId') teaId?: string,
  ) {
    const publicFilter = isPublic === 'true' ? true : isPublic === 'false' ? false : undefined;
    const userIdNum = userId ? parseInt(userId, 10) : undefined;
    const teaIdNum = teaId ? parseInt(teaId, 10) : undefined;
    return this.notesService.findAll(userIdNum, publicFilter, teaIdNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    
    let userId: number | undefined;
    if (req.user?.userId) {
      const parsedUserId = parseInt(req.user.userId, 10);
      if (Number.isNaN(parsedUserId)) {
        userId = undefined;
      } else {
        userId = parsedUserId;
      }
    }
    
    return this.notesService.findOne(parsedId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateNoteDto: UpdateNoteDto) {
    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(req.user.userId, 10);
    
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('Invalid userId');
    }
    
    return this.notesService.update(parsedId, parsedUserId, updateNoteDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(req.user.userId, 10);
    
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('Invalid userId');
    }
    
    return this.notesService.remove(parsedId, parsedUserId);
  }
}
