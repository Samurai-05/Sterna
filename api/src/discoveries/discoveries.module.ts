import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DiscoveriesController } from './discoveries.controller';
import { Discovery } from './discovery.entity';
import { DiscoveriesService } from './discoveries.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Discovery])],
  controllers: [DiscoveriesController],
  providers: [DiscoveriesService],
})
export class DiscoveriesModule {}
