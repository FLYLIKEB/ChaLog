import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeasService } from './teas.service';
import { CreateTeaDto } from './dto/create-tea.dto';
import { UpdateTeaDto } from './dto/update-tea.dto';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { mapTeaToResponse } from './teas.helper';

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
  async create(@Body() createTeaDto: CreateTeaDto) {
    const tea = await this.teasService.create(createTeaDto);
    return mapTeaToResponse(tea);
  }

  @Get()
  async findAll(
    @Query('q') query?: string,
    @Query('type') type?: string,
    @Query('minRating') minRatingStr?: string,
    @Query('sort') sort?: 'popular' | 'new' | 'rating',
    @Query('limit') limitStr?: string,
  ) {
    const hasFilters = query || type || minRatingStr || sort;
    const teas = hasFilters
      ? await (async () => {
          const minRating = minRatingStr ? parseFloat(minRatingStr) : undefined;
          const limit = limitStr ? parseInt(limitStr, 10) : undefined;
          return this.teasService.findWithFilters({
            q: query,
            type,
            minRating: Number.isNaN(minRating as number) ? undefined : minRating,
            sort,
            limit: Number.isNaN(limit as number) ? undefined : limit,
          });
        })()
      : await this.teasService.findAll();
    return teas.map(mapTeaToResponse);
  }

  @Get('trending')
  getTrending(@Query('period') period?: string) {
    const p = period === '30d' ? '30d' : '7d';
    return this.teasService.getTrendingTeas(p);
  }

  @Get('rankings/popular')
  async getPopularRankings(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const teas = await this.teasService.findPopularTeas(Number.isNaN(limitNum) ? 10 : limitNum);
    return teas.map(mapTeaToResponse);
  }

  @Get('rankings/new')
  async getNewRankings(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const teas = await this.teasService.findNewTeas(Number.isNaN(limitNum) ? 10 : limitNum);
    return teas.map(mapTeaToResponse);
  }

  @Get('sellers')
  async getSellers(@Query('q') query?: string) {
    const sellers = query?.trim()
      ? await this.teasService.findSellersByQuery(query.trim())
      : await this.teasService.findSellers();
    return { sellers };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('sellers')
  async createSeller(@Body() dto: CreateSellerDto) {
    return this.teasService.createSeller(dto);
  }

  @Get('sellers/by-name/:name')
  async getSellerByName(@Param('name') name: string) {
    return this.teasService.findSellerByName(name);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('sellers/by-name/:name')
  async updateSeller(@Param('name') name: string, @Body() dto: UpdateSellerDto) {
    return this.teasService.updateSeller(name, dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('curation')
  async getCuration(@Query('limit') limit?: string, @Request() req?: { user?: { userId: number } }) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const userId = req?.user?.userId;
    const teas = await this.teasService.findCurationTeas(Number.isNaN(limitNum) ? 10 : limitNum, userId);
    return teas.map(mapTeaToResponse);
  }

  @Get('by-seller/:name')
  async getBySeller(@Param('name') name: string) {
    const teas = await this.teasService.findBySeller(decodeURIComponent(name));
    return teas.map(mapTeaToResponse);
  }

  @Get('by-tags')
  getByTags(
    @Query('tags') tagsStr?: string,
    @Query('sort') sort?: 'match' | 'popular' | 'recent',
    @Query('limit') limitStr?: string,
  ) {
    const tags = tagsStr?.split(',').map((t) => t.trim()).filter(Boolean) ?? [];
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.teasService.findTeasByTags({
      tags,
      sort: sort && ['match', 'popular', 'recent'].includes(sort) ? sort : 'match',
      limit: Number.isNaN(limit) ? 50 : limit,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('wishlist/me')
  async getMyWishlist(@Request() req) {
    const teas = await this.teasService.findWishlisted(req.user.userId);
    return teas.map(mapTeaToResponse);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const tea = await this.teasService.findOne(parseTeaId(id));
    return mapTeaToResponse(tea);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/wishlist')
  async getWishlistStatus(@Param('id') id: string, @Request() req) {
    const wishlisted = await this.teasService.isWishlistedByUser(parseTeaId(id), req.user.userId);
    return { wishlisted };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/wishlist')
  async toggleWishlist(@Param('id') id: string, @Request() req) {
    return this.teasService.toggleWishlist(parseTeaId(id), req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeaDto) {
    const tea = await this.teasService.update(parseTeaId(id), dto);
    return mapTeaToResponse(tea);
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
  async getSimilarTeas(@Param('id') id: string) {
    const teas = await this.teasService.getSimilarTeas(parseTeaId(id));
    return teas.map(mapTeaToResponse);
  }

  @Get(':id/similar-by-tags')
  async getSimilarTeasByTags(@Param('id') id: string, @Query('limit') limitStr?: string) {
    const limit = limitStr ? parseInt(limitStr, 10) : 6;
    const teas = await this.teasService.getSimilarTeasByTags(parseTeaId(id), Number.isNaN(limit) ? 6 : limit);
    return teas.map(mapTeaToResponse);
  }
}
