import { Controller, Get, Param, BadRequestException, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    
    return this.usersService.findOne(parsedId);
  }
}
