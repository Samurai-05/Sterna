import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserDto } from './dto/user.dto';
import { DEFAULT_JWT_EXPIRES_IN_SECONDS } from './jwt.options';
import { hashPassword, verifyPassword } from './password';
import { User } from './user.entity';

/**
 * NFR-18: an unknown address and a wrong password are indistinguishable to the
 * caller. One message, one status, one response time.
 */
export const INVALID_CREDENTIALS =
  'The email address or password is incorrect.';

/**
 * A token can outlive the row it names, because the guard never reads the
 * database. This is where that shows up.
 */
export const ACCOUNT_GONE = 'This account no longer exists.';

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505';

/** The columns a password check needs, since password_hash is select: false. */
const WITH_PASSWORD_HASH = {
  id: true,
  email: true,
  userName: true,
  createdAt: true,
  passwordHash: true,
} as const;

/**
 * The address as it is stored and looked up.
 *
 * Postgres's UNIQUE index compares bytes, so without this "Ada@sterna.app" and
 * "ada@sterna.app" are two accounts — and the user who registered one would
 * fail to log into the other. Applied in the service rather than in the DTO so
 * the write path and the read path cannot diverge.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** True when a failed insert lost a race against another registration. */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown }).code === UNIQUE_VIOLATION;
}

/**
 * Entity to wire. The only path from a `users` row to a response body, which
 * is what guarantees password_hash cannot reach one (NFR-18).
 */
function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    userName: user.userName,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  private readonly expiresInSeconds: number;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    this.expiresInSeconds =
      config.get<number>('JWT_EXPIRES_IN_SECONDS') ??
      DEFAULT_JWT_EXPIRES_IN_SECONDS;
  }

  /** FR-01. Returns a token as well, so the client lands logged in. */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(dto.email);

    if (await this.users.existsBy({ email })) {
      throw new ConflictException(`An account already exists for "${email}".`);
    }

    const user = this.users.create({
      email,
      userName: dto.userName,
      passwordHash: await hashPassword(dto.password),
    });

    let saved: User;

    try {
      // The return value rather than `user`: save() does populate the identity
      // column and the timestamps in place, but depending on that mutation
      // makes the id arrive by side effect.
      saved = await this.users.save(user);
    } catch (error) {
      // The check above is not a lock: two simultaneous registrations both
      // pass it and one loses at the index. Both callers should see 409,
      // rather than one 409 and one 500.
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `An account already exists for "${email}".`,
        );
      }

      throw error;
    }

    return this.sessionFor(saved);
  }

  /** FR-02. */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(dto.email);

    const user = await this.users.findOne({
      where: { email },
      select: WITH_PASSWORD_HASH,
    });

    if (!user) {
      // Same argon2 cost as the verify() below, so "no such account" and
      // "wrong password" take the same time — otherwise response latency is a
      // user-enumeration oracle (NFR-18).
      await hashPassword(dto.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!(await verifyPassword(user.passwordHash, dto.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.sessionFor(user);
  }

  /** FR-03. The source of truth for the profile; the token only carries a copy. */
  async findById(id: string): Promise<UserDto> {
    return toUserDto(await this.requireUser(id));
  }

  /** FR-03. */
  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserDto> {
    if (dto.userName === undefined) {
      // A silent no-op 200 is a worse contract than a refusal: the client
      // cannot tell that nothing happened.
      throw new BadRequestException(
        'The request body must contain at least one field to update.',
      );
    }

    const user = await this.requireUser(id);

    user.userName = dto.userName;

    return toUserDto(await this.users.save(user));
  }

  /**
   * FR-02.
   *
   * Tokens issued before the change stay valid until they expire — the design
   * is stateless and has no revocation list (ADR-009).
   */
  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.requireUserWithHash(id);

    if (!(await verifyPassword(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException('The current password is incorrect.');
    }

    if (await verifyPassword(user.passwordHash, dto.newPassword)) {
      throw new BadRequestException(
        'The new password must be different from the current one.',
      );
    }

    user.passwordHash = await hashPassword(dto.newPassword);

    await this.users.save(user);
  }

  /** FR-01. Irreversible, and it cascades — hence the re-authentication. */
  async deleteAccount(id: string, currentPassword: string): Promise<void> {
    const user = await this.requireUserWithHash(id);

    if (!(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new BadRequestException('The current password is incorrect.');
    }

    await this.dataSource.transaction(async (manager) => {
      // fk_discoveries_group_membership is ON DELETE RESTRICT and Postgres
      // checks it immediately, so cascading the membership away while the
      // user's group discoveries still exist aborts the whole statement.
      // Removing them first is what makes the cascade legal.
      //
      // TODO(discoveries): move this into the discoveries module once it
      // exists. The photo objects it orphans in MinIO are a separate cleanup
      // (ADR-006).
      await manager.query('DELETE FROM discoveries WHERE user_id = $1', [id]);
      await manager.delete(User, { id });
    });
  }

  /** Mints the token and assembles the response the two entry points share. */
  private async sessionFor(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresInSeconds,
      user: toUserDto(user),
    };
  }

  /**
   * The account named by a valid token, or a 401.
   *
   * 401 rather than 404 on purpose: the guard is stateless and never reads the
   * database, so this is the one place a vanished subject surfaces, and 401 is
   * the answer that sends the client back to the login screen.
   */
  private async requireUser(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });

    if (!user) {
      throw new UnauthorizedException(ACCOUNT_GONE);
    }

    return user;
  }

  /** As requireUser, for the two paths that re-check the password. */
  private async requireUserWithHash(id: string): Promise<User> {
    const user = await this.users.findOne({
      where: { id },
      select: WITH_PASSWORD_HASH,
    });

    if (!user) {
      throw new UnauthorizedException(ACCOUNT_GONE);
    }

    return user;
  }
}
