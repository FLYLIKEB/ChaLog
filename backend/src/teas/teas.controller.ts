import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeasService } from './teas.service';
import { CreateTeaDto } from './dto/create-tea.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';

function parseTeaId(id: string): number {
  if (!/^\d+$/.test(id)) {
    throw new BadRequestException('Invalid id');
  }
  return Number(id);
}

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

  @Get('trending')
  getTrending(@Query('period') period?: string) {
    const p = period === '30d' ? '30d' : '7d';
    return this.teasService.getTrendingTeas(p);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teasService.findOne(parseTeaId(id));
  }

  @Get(':id/popular-tags')
  getPopularTags(@Param('id') id: string) {
    return this.teasService.getPopularTags(parseTeaId(id));
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/top-reviews')
  getTopReviews(@Param('id') id: string, @Request() req) {
    const currentUserId = req.user?.userId;
    return this.teasService.getTopReviews(parseTeaId(id), currentUserId);
  }

  @Get(':id/similar')
  getSimilarTeas(@Param('id') id: string) {
    return this.teasService.getSimilarTeas(parseTeaId(id));
  }
}
