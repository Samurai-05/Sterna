import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Discovery } from '../discoveries/discovery.entity';
import { MINIO_CLIENT } from './minio.client';
import { PhotoOrphanCleanupService } from './photo-orphan-cleanup.service';
import { PhotosService } from './photos.service';

const BUCKET = 'observations';

function* objects(items: Array<{ name: string; lastModified: Date }>) {
  yield* items;
}

describe('PhotoOrphanCleanupService', () => {
  const minio = { listObjects: jest.fn() };
  const discoveries = { query: jest.fn() };
  const remove = jest.fn();
  let service: PhotoOrphanCleanupService;

  beforeEach(async () => {
    jest.resetAllMocks();
    discoveries.query.mockResolvedValue([]);
    minio.listObjects.mockReturnValue(objects([]));

    const module = await Test.createTestingModule({
      providers: [
        PhotoOrphanCleanupService,
        { provide: MINIO_CLIENT, useValue: minio },
        { provide: ConfigService, useValue: { getOrThrow: () => BUCKET } },
        { provide: getRepositoryToken(Discovery), useValue: discoveries },
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

  it('does not remove fresh or referenced canonical photos', async () => {
    const fresh = 'photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    const referenced = 'photos/7f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
    minio.listObjects.mockReturnValue(
      objects([
        { name: fresh, lastModified: new Date('2026-08-30T12:00:00Z') },
        { name: referenced, lastModified: new Date('2026-08-29T00:00:00Z') },
      ]),
    );
    discoveries.query.mockResolvedValue([{ image_object_key: referenced }]);

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
