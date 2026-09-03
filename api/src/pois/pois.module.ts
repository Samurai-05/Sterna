import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Poi } from './poi.entity';
import { PoisController } from './pois.controller';
import { PoisService } from './pois.service';

@Module({
  imports: [TypeOrmModule.forFeature([Poi])],
  controllers: [PoisController],
  providers: [PoisService],
  // DiscoveriesModule imports this for requireExists(), to give confirming a
  // discovery against a bogus POI id a clean 404 instead of a raw
  // FK-violation 500.
  exports: [PoisService],
})
export class PoisModule {}
