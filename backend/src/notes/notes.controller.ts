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
    const userId = req.user?.userId ? parseInt(req.user.userId, 10) : undefined;
    return this.notesService.findOne(parseInt(id, 10), userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateNoteDto: UpdateNoteDto) {
    return this.notesService.update(parseInt(id, 10), parseInt(req.user.userId, 10), updateNoteDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.notesService.remove(parseInt(id, 10), parseInt(req.user.userId, 10));
  }
}
