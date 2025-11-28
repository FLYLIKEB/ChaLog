import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeasService } from './teas.service';
import { CreateTeaDto } from './dto/create-tea.dto';

@Controller('teas')
export class TeasController {
  constructor(private readonly teasService: TeasService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createTeaDto: CreateTeaDto) {
    return this.teasService.create(createTeaDto);
  }

  @Get()
  findAll(@Query('q') query?: string) {
    if (query) {
      return this.teasService.search(query);
    }
    return this.teasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    return this.teasService.findOne(parsedId);
  }
}
