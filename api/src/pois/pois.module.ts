import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Poi } from './poi.entity';
import { PoisController } from './pois.controller';
import { PoisService } from './pois.service';

@Module({
  imports: [TypeOrmModule.forFeature([Poi])],
  controllers: [PoisController],
  providers: [PoisService],
})
export class PoisModule {}
