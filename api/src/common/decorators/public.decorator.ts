import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route — or a whole controller — out of the global JwtAuthGuard.
 *
 * Applied per route rather than by listing paths inside the guard: the
 * exemption then lives next to the handler it exempts, where a reviewer
 * reading the endpoint sees it.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
