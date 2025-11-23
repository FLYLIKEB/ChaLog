import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeasService } from './teas.service';
import { TeasController } from './teas.controller';
import { Tea } from './entities/tea.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tea])],
  providers: [TeasService],
  controllers: [TeasController],
  exports: [TeasService],
})
export class TeasModule {}
