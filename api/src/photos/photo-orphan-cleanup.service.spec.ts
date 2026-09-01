import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { MINIO_CLIENT } from './minio.client';
import { PhotoOrphanCleanupService } from './photo-orphan-cleanup.service';
import { PhotosService } from './photos.service';

const BUCKET = 'observations';

function* objects(items: Array<{ name: string; lastModified: Date }>) {
  yield* items;
}

describe('PhotoOrphanCleanupService', () => {
  const minio = { listObjects: jest.fn() };
  const dataSource = { query: jest.fn() };
  const remove = jest.fn();
  let service: PhotoOrphanCleanupService;

  beforeEach(async () => {
    jest.resetAllMocks();
    dataSource.query.mockResolvedValue([]);
    minio.listObjects.mockReturnValue(objects([]));

    const module = await Test.createTestingModule({
      providers: [
        PhotoOrphanCleanupService,
        { provide: MINIO_CLIENT, useValue: minio },
        { provide: ConfigService, useValue: { getOrThrow: () => BUCKET } },
        { provide: DataSource, useValue: dataSource },
        { provide: PhotosService, useValue: { remove } },
      ],
    }).compile();

    service = module.get(PhotoOrphanCleanupService);
  });

  it('removes old unreferenced canonical photos and all variants', async () => {
    const key = 'photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    minio.listObjects.mockReturnValue(
      objects([{ name: key, lastModified: new Date('2026-08-29T00:00:00Z') }]),
    );

    await service.sweep(new Date('2026-08-31T00:00:00Z'));

    expect(remove).toHaveBeenCalledWith(key);
  });

  it('preserves an old photo referenced by a discovery', async () => {
    const referenced = 'photos/7f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    minio.listObjects.mockReturnValue(
      objects([
        { name: referenced, lastModified: new Date('2026-08-29T00:00:00Z') },
      ]),
    );
    dataSource.query.mockResolvedValue([{ object_key: referenced }]);

    await service.sweep(new Date('2026-08-31T00:00:00Z'));

    expect(remove).not.toHaveBeenCalled();
  });

  it('preserves an old photo referenced by a user avatar', async () => {
    const avatar = 'photos/8f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    minio.listObjects.mockReturnValue(
      objects([
        { name: avatar, lastModified: new Date('2026-08-29T00:00:00Z') },
      ]),
    );
    dataSource.query.mockResolvedValue([{ object_key: avatar }]);

    await service.sweep(new Date('2026-08-31T00:00:00Z'));

    expect(remove).not.toHaveBeenCalled();
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT avatar_object_key AS object_key'),
      [[avatar]],
    );
  });

  it('preserves an old photo referenced by both a discovery and a user avatar', async () => {
    const shared = 'photos/9f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    minio.listObjects.mockReturnValue(
      objects([
        { name: shared, lastModified: new Date('2026-08-29T00:00:00Z') },
      ]),
    );
    dataSource.query.mockResolvedValue([
      { object_key: shared },
      { object_key: shared },
    ]);

    await service.sweep(new Date('2026-08-31T00:00:00Z'));

    expect(remove).not.toHaveBeenCalled();
  });

  it('removes an old former avatar once it is no longer referenced', async () => {
    const formerAvatar = 'photos/af1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    minio.listObjects.mockReturnValue(
      objects([
        {
          name: formerAvatar,
          lastModified: new Date('2026-08-29T00:00:00Z'),
        },
      ]),
    );

    await service.sweep(new Date('2026-08-31T00:00:00Z'));

    expect(remove).toHaveBeenCalledWith(formerAvatar);
  });

  it('preserves recent unreferenced photos', async () => {
    const recent = 'photos/bf1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    minio.listObjects.mockReturnValue(
      objects([
        { name: recent, lastModified: new Date('2026-08-30T12:00:00Z') },
      ]),
    );

    await service.sweep(new Date('2026-08-31T00:00:00Z'));

    expect(remove).not.toHaveBeenCalled();
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('does not delete anything when the reference lookup fails', async () => {
    const candidate = 'photos/bf1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    minio.listObjects.mockReturnValue(
      objects([
        { name: candidate, lastModified: new Date('2026-08-29T00:00:00Z') },
      ]),
    );
    dataSource.query.mockRejectedValue(new Error('database unavailable'));

    await service.sweep(new Date('2026-08-31T00:00:00Z'));

    expect(remove).not.toHaveBeenCalled();
  });

  it('continues sweeping when one orphan family fails to remove', async () => {
    const first = 'photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    const second = 'photos/7f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    minio.listObjects.mockReturnValue(
      objects([
        { name: first, lastModified: new Date('2026-08-29T00:00:00Z') },
        { name: second, lastModified: new Date('2026-08-29T00:00:00Z') },
      ]),
    );
    remove
      .mockRejectedValueOnce(new Error('MinIO failure'))
      .mockResolvedValueOnce(undefined);

    await service.sweep(new Date('2026-08-31T00:00:00Z'));

    expect(remove).toHaveBeenNthCalledWith(1, first);
    expect(remove).toHaveBeenNthCalledWith(2, second);
  });
});
