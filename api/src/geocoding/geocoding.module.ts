import { Module } from '@nestjs/common';
import { GeocodingController } from './geocoding.controller';
import { GeocodingService } from './geocoding.service';

@Module({
  controllers: [GeocodingController],
  providers: [GeocodingService],
})
export class GeocodingModule {}
