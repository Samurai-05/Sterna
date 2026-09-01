import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { buildDataSourceOptions } from './config/data-source-options';
import { validate } from './config/env.validation';
import { throttlerOptions } from './config/throttling';
import { DiscoveriesModule } from './discoveries/discoveries.module';
import { GroupsModule } from './groups/groups.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { HealthModule } from './health/health.module';
import { PhotosModule } from './photos/photos.module';
import { PoisModule } from './pois/pois.module';

@Module({
  imports: [
    // isGlobal: ConfigService becomes injectable everywhere, without every
    // feature module having to import ConfigModule again.
    ConfigModule.forRoot({ isGlobal: true, validate }),
    // Declared before the feature modules so the throttle guard is resolved
    // ahead of AuthModule's JwtAuthGuard. Both are cheap, but a flood should
    // be turned away by the first thing it meets.
    ThrottlerModule.forRoot(throttlerOptions()),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildDataSourceOptions({
          POSTGRES_HOST: config.getOrThrow<string>('POSTGRES_HOST'),
          POSTGRES_PORT: config.getOrThrow<number>('POSTGRES_PORT'),
          POSTGRES_USER: config.getOrThrow<string>('POSTGRES_USER'),
          POSTGRES_PASSWORD: config.getOrThrow<string>('POSTGRES_PASSWORD'),
          POSTGRES_DB: config.getOrThrow<string>('POSTGRES_DB'),
        }),
        // Entities registered with TypeOrmModule.forFeature() join this
        // connection automatically — no manual entity list to maintain.
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    DiscoveriesModule,
    GeocodingModule,
    GroupsModule,
    HealthModule,
    PhotosModule,
    PoisModule,
  ],
  providers: [
    // The second global guard, alongside AuthModule's JwtAuthGuard. Routes opt
    // out with @SkipThrottle() and tighten with @Throttle().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
