import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import { MINIO_CLIENT } from './minio.client';
import { PhotosService } from './photos.service';

const BUCKET = 'observations';

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
    bucketExists: jest.fn(),
  };

  let service: PhotosService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        PhotosService,
        { provide: MINIO_CLIENT, useValue: minio },
        { provide: ConfigService, useValue: { getOrThrow: () => BUCKET } },
      ],
    }).compile();

    service = module.get(PhotosService);
  });

  describe('store', () => {
    it('puts the image under a photos/ key and returns the url to read it back', async () => {
      const result = await service.store({
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

    it('keeps the format of PNG and WebP uploads', async () => {
      const png = await service.store({
        buffer: await image('png'),
      } as Express.Multer.File);
      const webp = await service.store({
        buffer: await image('webp'),
      } as Express.Multer.File);

      expect(png.objectKey).toMatch(/\.png$/);
      expect(webp.objectKey).toMatch(/\.webp$/);
    });

    // FR-06
    it('reads the capture location out of the EXIF tags', async () => {
      const result = await service.store({
        buffer: await image('jpeg', geotagged),
      } as Express.Multer.File);

      expect(result.exif?.latitude).toBeCloseTo(46.783, 3);
      expect(result.exif?.longitude).toBeCloseTo(6.633, 3);
      expect(result.exif?.takenAt).toMatch(/^2026-08-20T/);
    });

    // FR-33 / NFR-33: a missing GPS tag must never block the upload.
    it('stores a photo without GPS tags and reports no location', async () => {
      await expect(
        service.store({ buffer: await image('jpeg') } as Express.Multer.File),
      ).resolves.toMatchObject({ exif: null });
    });

    // NFR-27: metadata must not reach other users.
    it('strips the metadata from the stored object', async () => {
      const original = await image('jpeg', geotagged);
      expect((await sharp(original).metadata()).exif).toBeDefined();

      await service.store({ buffer: original } as Express.Multer.File);

      const stored = (
        minio.putObject.mock.calls[0] as [string, string, Buffer]
      )[2];

      expect((await sharp(stored).metadata()).exif).toBeUndefined();
    });

    // NFR-21: the declared MIME type is client-supplied, so the bytes decide.
    it('rejects a file that is not a readable image', async () => {
      await expect(
        service.store({
          buffer: Buffer.from('not an image'),
        } as Express.Multer.File),
      ).rejects.toThrow(/not a readable image/);

      expect(minio.putObject).not.toHaveBeenCalled();
    });

    it('rejects an image format other than JPEG, PNG or WebP', async () => {
      await expect(
        service.store({
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
