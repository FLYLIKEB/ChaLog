import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CellarService } from './cellar.service';
import { CellarController } from './cellar.controller';
import { CellarItem } from './entities/cellar-item.entity';
import { TeasModule } from '../teas/teas.module';

@Module({
  imports: [TypeOrmModule.forFeature([CellarItem]), TeasModule],
  providers: [CellarService],
  controllers: [CellarController],
})
export class CellarModule {}
