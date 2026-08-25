import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

/** Injection token for the shared MinIO client. */
export const MINIO_CLIENT = 'MINIO_CLIENT';

/**
 * One client for the whole process. Credentials come from the validated
 * environment, so a missing variable fails at boot rather than on first upload.
 */
export const minioClientProvider = {
  provide: MINIO_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Client =>
    new Client({
      endPoint: config.getOrThrow<string>('MINIO_ENDPOINT'),
      port: config.getOrThrow<number>('MINIO_PORT'),
      useSSL: config.get<boolean>('MINIO_USE_SSL') ?? false,
      accessKey: config.getOrThrow<string>('MINIO_ROOT_USER'),
      secretKey: config.getOrThrow<string>('MINIO_ROOT_PASSWORD'),
    }),
};
