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
  ParseIntPipe,
  HttpCode,
  HttpStatus,
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
  create(@Request() req, @Body() createCellarItemDto: CreateCellarItemDto) {
    return this.cellarService.create(req.user.userId, createCellarItemDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.cellarService.findAll(req.user.userId);
  }

  @Get('reminders')
  findReminders(@Request() req) {
    return this.cellarService.findReminders(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.cellarService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCellarItemDto: UpdateCellarItemDto,
  ) {
    return this.cellarService.update(req.user.userId, id, updateCellarItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.cellarService.remove(req.user.userId, id);
  }
}
