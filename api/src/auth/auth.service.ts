import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { GroupRole } from '../groups/group-role';
import { PhotosService } from '../photos/photos.service';
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
 * A token can outlive the row it names — JwtAuthGuard now rejects one whose
 * account is gone, so this is the narrower race where the row disappears
 * between the guard and the handler.
 */
export const ACCOUNT_GONE = 'This account no longer exists.';

/**
 * The address is deliberately not echoed back: reflecting request input
 * into an error message gains the caller nothing they did not already type,
 * and it puts the address into every log line and error report downstream.
 */
export const ACCOUNT_ALREADY_EXISTS =
  'An account with that email address already exists.';

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505';

/** The columns a password check needs, since password_hash is select: false. */
const WITH_PASSWORD_HASH = {
  id: true,
  email: true,
  userName: true,
  avatarObjectKey: true,
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
    avatarObjectKey: user.avatarObjectKey,
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
    private readonly photos: PhotosService,
    config: ConfigService,
  ) {
    this.expiresInSeconds =
      config.get<number>('JWT_EXPIRES_IN_SECONDS') ??
      DEFAULT_JWT_EXPIRES_IN_SECONDS;
  }

  /**
   * FR-01. Returns a token as well, so the client lands logged in.
   *
   * The 409 discloses that an account exists. Login is deliberately
   * uniform about the same question — see the throwaway hash below — so the
   * two endpoints disagree and an attacker would simply use this one.
   * Eliminating the disclosure needs an email-verification flow, which
   * ADR-009 puts out of MVP scope; what is done instead is to stop echoing
   * the submitted address back and to rate-limit the route (see
   * @Throttle on the controller), so enumerating a list is slow.
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(dto.email);

    if (await this.users.existsBy({ email })) {
      throw new ConflictException(ACCOUNT_ALREADY_EXISTS);
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
        throw new ConflictException(ACCOUNT_ALREADY_EXISTS);
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
    if (dto.userName === undefined && dto.avatarObjectKey === undefined) {
      // A silent no-op 200 is a worse contract than a refusal: the client
      // cannot tell that nothing happened.
      throw new BadRequestException(
        'The request body must contain at least one field to update.',
      );
    }

    const user = await this.requireUser(id);
    const previousAvatarObjectKey = user.avatarObjectKey;

    // A key is not a capability: it is handed out in full on every shared
    // group map, so "the client sent it" does not mean "the client owns it".
    // Unchecked, this field is a way to aim the delete below at somebody
    // else's object — set it to their key, then set it to your own.
    if (dto.avatarObjectKey != null) {
      const owned = await this.photos.ownsPhoto(id, dto.avatarObjectKey);

      if (!owned) {
        throw new BadRequestException('Unknown photo.');
      }
    }

    if (dto.userName !== undefined) {
      user.userName = dto.userName;
    }
    if (dto.avatarObjectKey !== undefined) {
      user.avatarObjectKey = dto.avatarObjectKey;
    }

    const saved = await this.users.save(user);

    // As in deleteAccount(): only freed once the row change itself has
    // succeeded, and only when the photo actually changed (an update that
    // resends the same key must not delete the very object it just set).
    if (
      previousAvatarObjectKey &&
      previousAvatarObjectKey !== dto.avatarObjectKey &&
      dto.avatarObjectKey !== undefined
    ) {
      await this.photos.removeOwned(id, previousAvatarObjectKey);
    }

    return toUserDto(saved);
  }

  /**
   * FR-02.
   *
   * Every token issued before this call stops working, the caller's own
   * included: JwtAuthGuard compares each token's `iat` against
   * password_changed_at. There is still no revocation list — the comparison
   * is against a column, not a stored session (ADR-009, amended).
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
    user.passwordChangedAt = new Date();

    await this.users.save(user);
  }

  /** FR-01. Irreversible, and it cascades — hence the re-authentication. */
  async deleteAccount(id: string, currentPassword: string): Promise<void> {
    const user = await this.requireUserWithHash(id);

    if (!(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new BadRequestException('The current password is incorrect.');
    }

    // Harvested before the account goes: fk_photos_user cascades the rows
    // away with it. This asks the photos table who owns the objects, not the
    // discoveries table who references them — the two are not the same
    // question, and answering the second is how a co-member's key ended up in
    // this list.
    const objectKeys = await this.photos.listOwnedKeys(id);

    await this.dataSource.transaction(async (manager) => {
      // Groups the caller owns outright don't vanish with them: ownership
      // passes to another member, or the group is dissolved if the caller
      // was its only member. Run before the discoveries delete below: a
      // dissolved group's only discoveries are this user's own, about to be
      // deleted anyway, and group_members can't go until they are (RESTRICT).
      const dissolvedGroupIds = await this.reassignOwnedGroups(id, manager);

      // fk_discoveries_group_membership is ON DELETE RESTRICT and Postgres
      // checks it immediately, so cascading the membership away while the
      // user's group discoveries still exist aborts the whole statement.
      // Removing them first is what makes the cascade legal — the same trap
      // documented at GroupsService.remove().
      //
      // TODO(discoveries): move this into the discoveries module once it
      // exists.
      await manager.query('DELETE FROM discoveries WHERE user_id = $1', [id]);

      for (const groupId of dissolvedGroupIds) {
        await manager.query('DELETE FROM group_members WHERE group_id = $1', [
          groupId,
        ]);
        await manager.query('DELETE FROM groups WHERE id = $1', [groupId]);
      }

      await manager.delete(User, { id });
    });

    // MinIO isn't part of the SQL transaction above, so this only runs once
    // the account and its rows are already gone for good (ADR-006). The
    // avatar needs no separate collection: it is a photos row like any other.
    await this.photos.purgeOwnedObjects(objectKeys);
  }

  /**
   * Hands off every group the caller owns to its longest-tenured other
   * member, and returns the ids of the groups that had no other member — the
   * caller is responsible for dissolving those once it is legal to (see
   * deleteAccount()), mirroring GroupsService.remove().
   */
  private async reassignOwnedGroups(
    userId: string,
    manager: EntityManager,
  ): Promise<string[]> {
    const ownedGroups = await manager.query<{ group_id: string }[]>(
      'SELECT group_id FROM group_members WHERE user_id = $1 AND role = $2',
      [userId, GroupRole.Owner],
    );

    const dissolvedGroupIds: string[] = [];

    for (const { group_id: groupId } of ownedGroups) {
      const [successor] = await manager.query<{ user_id: string }[]>(
        `SELECT user_id FROM group_members
          WHERE group_id = $1 AND user_id != $2
          ORDER BY joined_at ASC, user_id ASC
          LIMIT 1`,
        [groupId, userId],
      );

      if (!successor) {
        dissolvedGroupIds.push(groupId);
        continue;
      }

      await manager.query(
        'UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3',
        [GroupRole.Owner, groupId, successor.user_id],
      );
    }

    return dissolvedGroupIds;
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
