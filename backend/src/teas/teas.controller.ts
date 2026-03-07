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
  findAll(
    @Query('q') query?: string,
    @Query('type') type?: string,
    @Query('minRating') minRatingStr?: string,
    @Query('sort') sort?: 'popular' | 'new' | 'rating',
    @Query('limit') limitStr?: string,
  ) {
    const hasFilters = query || type || minRatingStr || sort;
    if (hasFilters) {
      const minRating = minRatingStr ? parseFloat(minRatingStr) : undefined;
      const limit = limitStr ? parseInt(limitStr, 10) : undefined;
      return this.teasService.findWithFilters({
        q: query,
        type,
        minRating: Number.isNaN(minRating as number) ? undefined : minRating,
        sort,
        limit: Number.isNaN(limit as number) ? undefined : limit,
      });
    }
    return this.teasService.findAll();
  }

  @Get('rankings/popular')
  getPopularRankings(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.teasService.findPopularTeas(Number.isNaN(limitNum) ? 10 : limitNum);
  }

  @Get('rankings/new')
  getNewRankings(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.teasService.findNewTeas(Number.isNaN(limitNum) ? 10 : limitNum);
  }

  @Get('sellers')
  async getSellers() {
    const sellers = await this.teasService.findSellers();
    return { sellers };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('curation')
  getCuration(@Query('limit') limit?: string, @Request() req?: { user?: { userId: number } }) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const userId = req?.user?.userId;
    return this.teasService.findCurationTeas(Number.isNaN(limitNum) ? 10 : limitNum, userId);
  }

  @Get('by-seller/:name')
  getBySeller(@Param('name') name: string) {
    return this.teasService.findBySeller(decodeURIComponent(name));
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
