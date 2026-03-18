import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teaware } from './entities/teaware.entity';
import { TeawareService } from './teaware.service';
import { TeawareController } from './teaware.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Teaware])],
  providers: [TeawareService],
  controllers: [TeawareController],
  exports: [TeawareService],
})
export class TeawareModule {}
