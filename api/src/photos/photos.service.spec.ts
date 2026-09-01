import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import { MINIO_CLIENT } from './minio.client';
import { Photo } from './photo.entity';
import { PhotosService } from './photos.service';

const BUCKET = 'observations';
const UPLOADER = '1';
const OTHER_USER = '2';
const KEY = 'photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';
/** The original plus the map/card/detail variants store() derives from it. */
const FAMILY_SIZE = 4;

/** A 8x8 image, optionally carrying the EXIF tags a phone camera would write. */
function image(
  format: 'jpeg' | 'png' | 'webp',
  exif?: sharp.Exif,
): Promise<Buffer> {
  const pipeline = sharp({
    create: { width: 8, height: 8, channels: 3, background: 'red' },
  });

  return (exif ? pipeline.withExif(exif) : pipeline)
    .toFormat(format)
    .toBuffer();
}

const geotagged: sharp.Exif = {
  // IFD2 is the Exif sub-IFD, IFD3 the GPS one.
  IFD2: { DateTimeOriginal: '2026:08:20 14:02:11' },
  IFD3: {
    GPSLatitudeRef: 'N',
    GPSLatitude: '46/1 47/1 0/1',
    GPSLongitudeRef: 'E',
    GPSLongitude: '6/1 38/1 0/1',
  },
};

/** The MinIO error shape for a missing object, as opposed to an outage. */
function notFound(): Error {
  return Object.assign(new Error('Not Found'), { code: 'NotFound' });
}

describe('PhotosService', () => {
  const minio = {
    putObject: jest.fn(),
    statObject: jest.fn(),
    getObject: jest.fn(),
    removeObject: jest.fn(),
    bucketExists: jest.fn(),
  };

  const photos = {
    insert: jest.fn(),
    existsBy: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    query: jest.fn(),
  };

  let service: PhotosService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        PhotosService,
        { provide: MINIO_CLIENT, useValue: minio },
        { provide: getRepositoryToken(Photo), useValue: photos },
        { provide: ConfigService, useValue: { getOrThrow: () => BUCKET } },
      ],
    }).compile();

    service = module.get(PhotosService);
  });

  describe('store', () => {
    // The row is what every later ownership question is answered from.
    it('records the uploader alongside the key', async () => {
      const result = await service.store(UPLOADER, {
        buffer: await image('jpeg'),
      } as Express.Multer.File);

      expect(photos.insert).toHaveBeenCalledWith({
        objectKey: result.objectKey,
        userId: UPLOADER,
        contentType: 'image/jpeg',
        // Cast because expect.any() is typed `any`, which the type-checked
        // lint rules reject inside an object literal.
        byteSize: expect.any(String) as string,
      });
    });

    it('puts the image under a photos/ key and returns the url to read it back', async () => {
      const result = await service.store(UPLOADER, {
        buffer: await image('jpeg'),
      } as Express.Multer.File);

      expect(result.objectKey).toMatch(/^photos\/[0-9a-f-]{36}\.jpg$/);
      expect(result.url).toBe(`/api/${result.objectKey}`);
      expect(minio.putObject).toHaveBeenCalledWith(
        BUCKET,
        result.objectKey,
        expect.any(Buffer),
        expect.any(Number),
        { 'Content-Type': 'image/jpeg' },
      );
    });

    it('generates map, card and detail WebP variants without enlarging images', async () => {
      const source = await sharp({
        create: {
          width: 800,
          height: 400,
          channels: 3,
          background: 'red',
        },
      })
        .jpeg()
        .toBuffer();

      const result = await service.store(UPLOADER, {
        buffer: source,
      } as Express.Multer.File);
      const calls = minio.putObject.mock.calls as Array<
        [string, string, Buffer, number, Record<string, string>]
      >;
      const originalStem = result.objectKey.replace(/\.[^.]+$/, '');

      expect(calls.map((call) => call[1])).toEqual([
        result.objectKey,
        `${originalStem}.map.webp`,
        `${originalStem}.card.webp`,
        `${originalStem}.detail.webp`,
      ]);

      for (const [key, , buffer] of calls.slice(1)) {
        const metadata = await sharp(buffer).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBeLessThanOrEqual(
          key.includes('.map.') ? 192 : key.includes('.card.') ? 640 : 1600,
        );
      }
    });

    it('removes every object when a variant upload fails', async () => {
      const uploadError = new Error('card variant storage failed');
      minio.putObject.mockImplementation(
        (_bucket: string, key: string): Promise<void> => {
          if (key.includes('.card.')) return Promise.reject(uploadError);
          return Promise.resolve();
        },
      );

      await expect(
        service.store(UPLOADER, {
          buffer: await image('jpeg'),
        } as Express.Multer.File),
      ).rejects.toBe(uploadError);

      const originalKey = (
        minio.putObject.mock.calls[0] as [string, string]
      )[1];
      const stem = originalKey.replace(/\.[^.]+$/, '');
      const removeCalls = minio.removeObject.mock.calls as Array<
        [string, string]
      >;
      expect(removeCalls.map(([, key]) => key)).toEqual([
        originalKey,
        `${stem}.map.webp`,
        `${stem}.card.webp`,
        `${stem}.detail.webp`,
      ]);
    });

    it('preserves the upload error if rollback cleanup also fails', async () => {
      const uploadError = new Error('detail variant storage failed');
      minio.putObject.mockImplementation(
        (_bucket: string, key: string): Promise<void> => {
          if (key.includes('.detail.')) return Promise.reject(uploadError);
          return Promise.resolve();
        },
      );
      minio.removeObject.mockRejectedValue(new Error('cleanup failed'));

      await expect(
        service.store(UPLOADER, {
          buffer: await image('jpeg'),
        } as Express.Multer.File),
      ).rejects.toBe(uploadError);
    });

    it('keeps the format of PNG and WebP uploads', async () => {
      const png = await service.store(UPLOADER, {
        buffer: await image('png'),
      } as Express.Multer.File);
      const webp = await service.store(UPLOADER, {
        buffer: await image('webp'),
      } as Express.Multer.File);

      expect(png.objectKey).toMatch(/\.png$/);
      expect(webp.objectKey).toMatch(/\.webp$/);
    });

    // FR-06
    it('reads the capture location out of the EXIF tags', async () => {
      const result = await service.store(UPLOADER, {
        buffer: await image('jpeg', geotagged),
      } as Express.Multer.File);

      expect(result.metadata.location?.latitude).toBeCloseTo(46.783, 3);
      expect(result.metadata.location?.longitude).toBeCloseTo(6.633, 3);
      expect(result.metadata.takenAt).toMatch(/^2026-08-20T/);
    });

    // FR-33 / NFR-33: a missing GPS tag must never block the upload.
    it('preserves a capture date even when GPS tags are absent', async () => {
      const result = await service.store(UPLOADER, {
        buffer: await image('jpeg', {
          IFD2: { DateTimeOriginal: '2026:08:20 14:02:11' },
        }),
      } as Express.Multer.File);

      expect(result.metadata.location).toBeNull();
      expect(result.metadata.takenAt).toMatch(/^2026-08-20T/);
    });

    it('preserves a photo location when the capture date is absent', async () => {
      const result = await service.store(UPLOADER, {
        buffer: await image('jpeg', {
          IFD3: {
            GPSLatitudeRef: 'N',
            GPSLatitude: '46/1 47/1 0/1',
            GPSLongitudeRef: 'E',
            GPSLongitude: '6/1 38/1 0/1',
          },
        }),
      } as Express.Multer.File);

      expect(result.metadata.location?.latitude).toBeCloseTo(46.783, 3);
      expect(result.metadata.takenAt).toBeNull();
    });

    it('stores a photo without metadata and reports no location or date', async () => {
      await expect(
        service.store(UPLOADER, {
          buffer: await image('jpeg'),
        } as Express.Multer.File),
      ).resolves.toMatchObject({
        exif: null,
        metadata: { location: null, takenAt: null },
      });
    });

    // NFR-27: metadata must not reach other users.
    it('strips the metadata from the stored object', async () => {
      const original = await image('jpeg', geotagged);
      expect((await sharp(original).metadata()).exif).toBeDefined();

      await service.store(UPLOADER, {
        buffer: original,
      } as Express.Multer.File);

      const stored = (
        minio.putObject.mock.calls[0] as [string, string, Buffer]
      )[2];

      expect((await sharp(stored).metadata()).exif).toBeUndefined();

      const storedVariants = (
        minio.putObject.mock.calls as Array<[string, string, Buffer]>
      ).slice(1);
      for (const [, , variant] of storedVariants) {
        expect((await sharp(variant).metadata()).exif).toBeUndefined();
      }
    });

    // NFR-21: the declared MIME type is client-supplied, so the bytes decide.
    it('rejects a file that is not a readable image', async () => {
      await expect(
        service.store(UPLOADER, {
          buffer: Buffer.from('not an image'),
        } as Express.Multer.File),
      ).rejects.toThrow(/not a readable image/);

      expect(minio.putObject).not.toHaveBeenCalled();
    });

    it('rejects an image format other than JPEG, PNG or WebP', async () => {
      await expect(
        service.store(UPLOADER, {
          buffer: await image('jpeg').then((buffer) =>
            sharp(buffer).tiff().toBuffer(),
          ),
        } as Express.Multer.File),
      ).rejects.toThrow(/Unsupported image format "tiff"/);
    });
  });

  describe('read', () => {
    it('returns the stream and the stored content type', async () => {
      minio.statObject.mockResolvedValue({
        size: 42,
        metaData: { 'content-type': 'image/webp' },
      });
      minio.getObject.mockResolvedValue('stream');

      const result = await service.read(
        '6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.webp',
      );

      expect(result.contentType).toBe('image/webp');
      expect(result.size).toBe(42);
    });

    it('falls back to the original object when a requested variant is absent', async () => {
      minio.statObject.mockRejectedValueOnce(notFound()).mockResolvedValueOnce({
        size: 42,
        metaData: { 'content-type': 'image/jpeg' },
      });
      minio.getObject.mockResolvedValue('stream');

      await service.read('6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg', 'card');

      expect(minio.statObject.mock.calls).toEqual([
        [BUCKET, 'photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.card.webp'],
        [BUCKET, 'photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg'],
      ]);
    });

    it('404s on a missing object', async () => {
      minio.statObject.mockRejectedValue(notFound());

      await expect(
        service.read('6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg'),
      ).rejects.toThrow(/Unknown photo/);
    });

    // A cacheable 404 would hide an outage for a year — see the read endpoint.
    it('propagates a MinIO outage instead of reporting a missing photo', async () => {
      minio.statObject.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(
        service.read('6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg'),
      ).rejects.toThrow(/ECONNREFUSED/);
    });

    it('never asks MinIO for a key it did not mint', async () => {
      await expect(service.read('../../etc/passwd')).rejects.toThrow(
        /Unknown photo/,
      );

      expect(minio.statObject).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes the original and every generated variant', async () => {
      const objectKey = 'photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg';

      await service.remove(objectKey);

      const stem = objectKey.replace(/\.[^.]+$/, '');
      const removeCalls = minio.removeObject.mock.calls as Array<
        [string, string]
      >;
      expect(removeCalls.map(([, key]) => key)).toEqual([
        objectKey,
        `${stem}.map.webp`,
        `${stem}.card.webp`,
        `${stem}.detail.webp`,
      ]);
    });

    it('attempts every deletion before returning a storage error', async () => {
      const deletionError = new Error('MinIO deletion failed');
      minio.removeObject.mockImplementation(
        (_bucket: string, key: string): Promise<void> =>
          key.includes('.card.')
            ? Promise.reject(deletionError)
            : Promise.resolve(),
      );

      await expect(
        service.remove('photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg'),
      ).rejects.toBe(deletionError);

      expect(minio.removeObject).toHaveBeenCalledTimes(4);
    });
  });

  describe('exists', () => {
    it('is false for a missing object and true for a present one', async () => {
      minio.statObject.mockResolvedValueOnce({});
      await expect(service.exists('photos/a.jpg')).resolves.toBe(true);

      minio.statObject.mockRejectedValueOnce(notFound());
      await expect(service.exists('photos/a.jpg')).resolves.toBe(false);
    });

    // NFR-32: an outage must not make a valid photo look absent, or the
    // discovery that references it would be rejected for the wrong reason.
    it('propagates a MinIO outage', async () => {
      minio.statObject.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(service.exists('photos/a.jpg')).rejects.toThrow(
        /ECONNREFUSED/,
      );
    });
  });

  describe('removeOwned', () => {
    // The delete is the ownership check. A key belonging to somebody else
    // matches no row, so nothing is deleted and MinIO is never touched.
    it('leaves an object owned by another account alone', async () => {
      photos.delete.mockResolvedValue({ affected: 0 });

      await expect(service.removeOwned(OTHER_USER, KEY)).resolves.toBe(false);

      expect(photos.delete).toHaveBeenCalledWith({
        objectKey: KEY,
        userId: OTHER_USER,
      });
      expect(minio.removeObject).not.toHaveBeenCalled();
    });

    it('frees the whole family of an object the caller uploaded', async () => {
      photos.delete.mockResolvedValue({ affected: 1 });

      await expect(service.removeOwned(UPLOADER, KEY)).resolves.toBe(true);

      // The original plus every generated variant — leaving the derivatives
      // behind would keep the photo readable and the bucket growing.
      expect(minio.removeObject).toHaveBeenCalledWith(BUCKET, KEY);
      expect(minio.removeObject).toHaveBeenCalledWith(
        BUCKET,
        KEY.replace(/\.jpg$/, '.card.webp'),
      );
      expect(minio.removeObject).toHaveBeenCalledTimes(FAMILY_SIZE);
    });
  });

  describe('canRead', () => {
    // NFR-24/25: being signed in is not the question — the key is published
    // to every member of a shared group map.
    it('is whatever the ownership-or-co-membership query says', async () => {
      photos.query.mockResolvedValue([{ allowed: false }]);
      await expect(service.canRead(OTHER_USER, KEY)).resolves.toBe(false);

      photos.query.mockResolvedValue([{ allowed: true }]);
      await expect(service.canRead(UPLOADER, KEY)).resolves.toBe(true);

      expect(photos.query).toHaveBeenLastCalledWith(expect.any(String), [
        KEY,
        UPLOADER,
      ]);
    });

    it('denies when the query returns nothing at all', async () => {
      photos.query.mockResolvedValue([]);

      await expect(service.canRead(UPLOADER, KEY)).resolves.toBe(false);
    });
  });

  describe('purgeOwnedObjects', () => {
    // The account is already gone by this point, so one MinIO failure
    // must not abandon the remaining keys or 500 the caller.
    it('attempts every key even when one fails', async () => {
      minio.removeObject
        .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
        .mockResolvedValueOnce(undefined);

      await expect(
        service.purgeOwnedObjects([KEY, 'photos/other.jpg']),
      ).resolves.toBeUndefined();

      expect(minio.removeObject).toHaveBeenCalledTimes(FAMILY_SIZE * 2);
    });
  });

  describe('isCanonicalObjectKey', () => {
    it('accepts only Sterna canonical UUID photo keys', () => {
      expect(
        service.isCanonicalObjectKey(
          'photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg',
        ),
      ).toBe(true);
      expect(
        service.isCanonicalObjectKey(
          'photos/6f1c2a700d1e4f0b9d8e2c4a1b3d5e6f.jpg',
        ),
      ).toBe(false);
      expect(
        service.isCanonicalObjectKey(
          'photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.map.webp',
        ),
      ).toBe(false);
    });
  });

  describe('assertBucketReachable', () => {
    it('resolves when the bucket is there', async () => {
      minio.bucketExists.mockResolvedValue(true);

      await expect(service.assertBucketReachable()).resolves.toBeUndefined();
    });

    it('throws when the bucket is missing', async () => {
      minio.bucketExists.mockResolvedValue(false);

      await expect(service.assertBucketReachable()).rejects.toThrow(
        /does not exist/,
      );
    });
  });
});
