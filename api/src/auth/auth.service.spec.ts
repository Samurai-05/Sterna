import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PhotosService } from '../photos/photos.service';
import { AuthService } from './auth.service';
import { hashPassword } from './password';
import { User } from './user.entity';

const PASSWORD = 'correct horse battery staple';
const TOKEN = 'a.signed.token';

/** A stored account, with the argon2 hash the password checks read back. */
async function storedUser(password = PASSWORD): Promise<User> {
  return {
    id: '1',
    email: 'ada@sterna.test',
    userName: 'Ada',
    passwordHash: await hashPassword(password),
    createdAt: new Date('2026-08-26T09:14:33.482Z'),
    updatedAt: new Date('2026-08-26T09:14:33.482Z'),
  };
}

/** The MinIO-style error shape Postgres uses for a unique index violation. */
function uniqueViolation(): Error {
  return Object.assign(new Error('duplicate key'), { code: '23505' });
}

describe('AuthService', () => {
  const users = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    existsBy: jest.fn(),
  };
  const jwt = { signAsync: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  const manager = { query: jest.fn(), delete: jest.fn() };
  const photos = { remove: jest.fn() };

  let service: AuthService;

  beforeEach(async () => {
    jest.resetAllMocks();

    jwt.signAsync.mockResolvedValue(TOKEN);
    users.create.mockImplementation((fields: Partial<User>) => fields);
    // save() stands in for the database, so it fills in what the identity
    // column and the DEFAULT NOW() would.
    users.save.mockImplementation((user: User) => ({
      id: '1',
      createdAt: new Date('2026-08-26T09:14:33.482Z'),
      ...user,
    }));
    dataSource.transaction.mockImplementation(
      (run: (m: typeof manager) => Promise<void>) => run(manager),
    );
    // A safe default for the deleteAccount tests that don't care about groups
    // or discoveries: an empty result set for every SELECT.
    manager.query.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: DataSource, useValue: dataSource },
        { provide: PhotosService, useValue: photos },
        { provide: ConfigService, useValue: { get: () => 604800 } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('stores the email lower-cased and trimmed', async () => {
      users.existsBy.mockResolvedValue(false);

      await service.register({
        email: '  Ada@Sterna.TEST ',
        userName: 'Ada',
        password: PASSWORD,
      });

      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@sterna.test' }),
      );
    });

    it('stores an argon2 hash and never the password itself', async () => {
      users.existsBy.mockResolvedValue(false);

      await service.register({
        email: 'ada@sterna.test',
        userName: 'Ada',
        password: PASSWORD,
      });

      const [created] = users.create.mock.calls[0] as [Partial<User>];

      expect(created.passwordHash).toMatch(/^\$argon2id\$/);
      expect(created.passwordHash).not.toContain(PASSWORD);
    });

    it('returns a token and the created account', async () => {
      users.existsBy.mockResolvedValue(false);
      users.save.mockImplementation((user: User) => ({
        ...user,
        id: '7',
        createdAt: new Date('2026-08-26T09:14:33.482Z'),
      }));

      const result = await service.register({
        email: 'ada@sterna.test',
        userName: 'Ada',
        password: PASSWORD,
      });

      expect(result).toEqual({
        accessToken: TOKEN,
        tokenType: 'Bearer',
        expiresIn: 604800,
        user: {
          id: '7',
          email: 'ada@sterna.test',
          userName: 'Ada',
          createdAt: '2026-08-26T09:14:33.482Z',
        },
      });
    });

    // NFR-18: the hash must not be reachable through a response body.
    it('never puts the password hash in the response', async () => {
      users.existsBy.mockResolvedValue(false);

      const result = await service.register({
        email: 'ada@sterna.test',
        userName: 'Ada',
        password: PASSWORD,
      });

      expect(JSON.stringify(result)).not.toContain('argon2');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    // FR-01: one account per address.
    it('refuses an address that already exists', async () => {
      users.existsBy.mockResolvedValue(true);

      await expect(
        service.register({
          email: 'ada@sterna.test',
          userName: 'Ada',
          password: PASSWORD,
        }),
      ).rejects.toThrow(/already exists/);
      expect(users.save).not.toHaveBeenCalled();
    });

    // Two simultaneous registrations both pass the existsBy check; the loser
    // must still get a 409 rather than a 500.
    it('refuses a duplicate the pre-check lost the race to', async () => {
      users.existsBy.mockResolvedValue(false);
      users.save.mockRejectedValue(uniqueViolation());

      await expect(
        service.register({
          email: 'ada@sterna.test',
          userName: 'Ada',
          password: PASSWORD,
        }),
      ).rejects.toThrow(/already exists/);
    });

    it('rethrows a database failure that is not a unique violation', async () => {
      users.existsBy.mockResolvedValue(false);
      users.save.mockRejectedValue(new Error('connection terminated'));

      await expect(
        service.register({
          email: 'ada@sterna.test',
          userName: 'Ada',
          password: PASSWORD,
        }),
      ).rejects.toThrow(/connection terminated/);
    });
  });

  describe('login', () => {
    // FR-02.
    it('returns a token for correct credentials', async () => {
      users.findOne.mockResolvedValue(await storedUser());

      const result = await service.login({
        email: 'ada@sterna.test',
        password: PASSWORD,
      });

      expect(result.accessToken).toBe(TOKEN);
      expect(result.user.email).toBe('ada@sterna.test');
    });

    it('looks the address up lower-cased', async () => {
      users.findOne.mockResolvedValue(await storedUser());

      await service.login({ email: 'Ada@Sterna.TEST', password: PASSWORD });

      expect(users.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'ada@sterna.test' } }),
      );
    });

    // password_hash is select: false, so it has to be asked for by name.
    // Without it the hash is undefined at runtime and every login fails.
    it('asks for the password hash the entity hides by default', async () => {
      users.findOne.mockResolvedValue(await storedUser());

      await service.login({ email: 'ada@sterna.test', password: PASSWORD });

      const [options] = users.findOne.mock.calls[0] as [
        { select: Record<string, boolean> },
      ];

      expect(options.select.passwordHash).toBe(true);
    });

    it('rejects a wrong password', async () => {
      users.findOne.mockResolvedValue(await storedUser());

      await expect(
        service.login({ email: 'ada@sterna.test', password: 'wrong password' }),
      ).rejects.toThrow(/email address or password is incorrect/);
    });

    // NFR-18: an unknown address must be indistinguishable from a wrong
    // password, in wording and in cost.
    it('rejects an unknown address with the same message as a wrong password', async () => {
      users.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@sterna.test', password: PASSWORD }),
      ).rejects.toThrow(/email address or password is incorrect/);
    });

    it('spends the hashing budget when the address is unknown', async () => {
      users.findOne.mockResolvedValue(null);

      const started = Date.now();

      await expect(
        service.login({ email: 'nobody@sterna.test', password: PASSWORD }),
      ).rejects.toThrow();

      // A bare lookup-and-throw returns in well under a millisecond; a real
      // argon2 pass costs tens of them.
      expect(Date.now() - started).toBeGreaterThan(5);
    });
  });

  describe('findById', () => {
    // FR-03.
    it('returns the public projection of the account', async () => {
      users.findOneBy.mockResolvedValue(await storedUser());

      await expect(service.findById('1')).resolves.toEqual({
        id: '1',
        email: 'ada@sterna.test',
        userName: 'Ada',
        createdAt: '2026-08-26T09:14:33.482Z',
      });
    });

    // The guard never reads the database, so a token can outlive its row.
    it('rejects a valid token whose account is gone', async () => {
      users.findOneBy.mockResolvedValue(null);

      await expect(service.findById('1')).rejects.toThrow(/no longer exists/);
    });
  });

  describe('updateProfile', () => {
    // FR-03.
    it('renames the account', async () => {
      users.findOneBy.mockResolvedValue(await storedUser());

      const result = await service.updateProfile('1', { userName: 'Ada L.' });

      expect(result.userName).toBe('Ada L.');
      expect(users.save).toHaveBeenCalled();
    });

    // A silent no-op 200 would leave the client unable to tell nothing changed.
    it('refuses a body with nothing to update', async () => {
      await expect(service.updateProfile('1', {})).rejects.toThrow(
        /at least one field/,
      );
      expect(users.save).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    // FR-02.
    it('replaces the stored hash', async () => {
      const user = await storedUser();
      // Captured up front: the service mutates the entity in place, so reading
      // user.passwordHash after the call would compare it against itself.
      const originalHash = user.passwordHash;
      users.findOne.mockResolvedValue(user);

      await service.changePassword('1', {
        currentPassword: PASSWORD,
        newPassword: 'a whole different passphrase',
      });

      const [saved] = users.save.mock.calls[0] as [User];

      expect(saved.passwordHash).toMatch(/^\$argon2id\$/);
      expect(saved.passwordHash).not.toBe(originalHash);
    });

    it('refuses a wrong current password', async () => {
      users.findOne.mockResolvedValue(await storedUser());

      await expect(
        service.changePassword('1', {
          currentPassword: 'wrong password',
          newPassword: 'a whole different passphrase',
        }),
      ).rejects.toThrow(/current password is incorrect/);
      expect(users.save).not.toHaveBeenCalled();
    });

    it('refuses a new password equal to the current one', async () => {
      users.findOne.mockResolvedValue(await storedUser());

      await expect(
        service.changePassword('1', {
          currentPassword: PASSWORD,
          newPassword: PASSWORD,
        }),
      ).rejects.toThrow(/must be different/);
      expect(users.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    // fk_discoveries_group_membership is ON DELETE RESTRICT, so the discoveries
    // have to go before the row that cascades the memberships away.
    it('deletes the discoveries before the user, in one transaction', async () => {
      users.findOne.mockResolvedValue(await storedUser());

      await service.deleteAccount('1', PASSWORD);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM discoveries'),
        ['1'],
      );
      expect(manager.query.mock.invocationCallOrder[0]).toBeLessThan(
        manager.delete.mock.invocationCallOrder[0],
      );
    });

    it('refuses a wrong current password and leaves the row alone', async () => {
      users.findOne.mockResolvedValue(await storedUser());

      await expect(
        service.deleteAccount('1', 'wrong password'),
      ).rejects.toThrow(/current password is incorrect/);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    // A group the caller owns must not survive them ownerless.
    it('hands ownership of an owned group to its longest-tenured other member', async () => {
      users.findOne.mockResolvedValue(await storedUser());
      manager.query
        .mockResolvedValueOnce([{ group_id: 'group-1' }]) // owned groups
        .mockResolvedValueOnce([{ user_id: 'user-2' }]); // the successor

      await service.deleteAccount('1', PASSWORD);

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE group_members SET role'),
        ['owner', 'group-1', 'user-2'],
      );
      expect(manager.query).not.toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM groups'),
        expect.anything(),
      );
    });

    // The schema permits zero owners, but nothing should have to notice: a
    // group the caller solely occupied is dissolved rather than left orphaned.
    it('dissolves an owned group that has no other member', async () => {
      users.findOne.mockResolvedValue(await storedUser());
      manager.query
        .mockResolvedValueOnce([{ group_id: 'group-1' }]) // owned groups
        .mockResolvedValueOnce([]); // no successor

      await service.deleteAccount('1', PASSWORD);

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM group_members'),
        ['group-1'],
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM groups'),
        ['group-1'],
      );
    });

    // The MinIO objects behind the deleted discoveries would otherwise be
    // orphaned forever (ADR-006).
    it('removes the photo objects behind the deleted discoveries', async () => {
      users.findOne.mockResolvedValue(await storedUser());
      manager.query
        .mockResolvedValueOnce([]) // owned groups
        .mockResolvedValueOnce([
          { image_object_key: 'photos/a.jpg' },
          { image_object_key: null },
          { image_object_key: 'photos/b.jpg' },
        ]); // the caller's discoveries

      await service.deleteAccount('1', PASSWORD);

      expect(photos.remove).toHaveBeenCalledTimes(2);
      expect(photos.remove).toHaveBeenCalledWith('photos/a.jpg');
      expect(photos.remove).toHaveBeenCalledWith('photos/b.jpg');
    });

    it('does not touch MinIO until the account and its rows are gone', async () => {
      users.findOne.mockResolvedValue(await storedUser());
      manager.query
        .mockResolvedValueOnce([]) // owned groups
        .mockResolvedValueOnce([{ image_object_key: 'photos/a.jpg' }]);

      await service.deleteAccount('1', PASSWORD);

      expect(manager.delete.mock.invocationCallOrder[0]).toBeLessThan(
        photos.remove.mock.invocationCallOrder[0],
      );
    });
  });
});
