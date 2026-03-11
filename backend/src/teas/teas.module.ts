import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeasService } from './teas.service';
import { TeasController } from './teas.controller';
import { Tea } from './entities/tea.entity';
import { Seller } from './entities/seller.entity';
import { TeaWishlist } from './entities/tea-wishlist.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tea, Seller, TeaWishlist]), UsersModule],
  providers: [TeasService],
  controllers: [TeasController],
  exports: [TeasService],
})
export class TeasModule {}
