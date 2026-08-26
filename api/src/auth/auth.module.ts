import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { jwtModuleOptions } from './jwt.options';
import { User } from './user.entity';

/**
 * Authentication and users — the first module ADR-003 names.
 *
 * The User entity lives here rather than in a separate users module because
 * ADR-003 lists the two as a single responsibility.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync(jwtModuleOptions),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Declared here rather than in AppModule so the guard sits in the module
    // that provides the JwtService it injects. APP_GUARD is application-wide
    // wherever it is declared: every controller route goes through it, and a
    // route is private unless it says @Public() (NFR-18).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  // Exported for the discoveries and groups modules, which need to resolve a
  // discovery's author and a group's members.
  exports: [TypeOrmModule],
})
export class AuthModule {}
