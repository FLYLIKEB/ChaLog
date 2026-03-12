import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeasService } from './teas.service';
import { TeasController } from './teas.controller';
import { SellerService } from './seller.service';
import { TeaRecommendationService } from './tea-recommendation.service';
import { TeaAnalyticsService } from './tea-analytics.service';
import { Tea } from './entities/tea.entity';
import { Seller } from './entities/seller.entity';
import { TeaWishlist } from './entities/tea-wishlist.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tea, Seller, TeaWishlist]), UsersModule],
  providers: [TeasService, SellerService, TeaRecommendationService, TeaAnalyticsService],
  controllers: [TeasController],
  exports: [TeasService],
})
export class TeasModule {}
