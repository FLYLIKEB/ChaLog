import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { TeasService } from './teas.service';
import { CreateTeaDto } from './dto/create-tea.dto';

@Controller('teas')
export class TeasController {
  constructor(private readonly teasService: TeasService) {}

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
    return this.teasService.findOne(id);
  }
}
