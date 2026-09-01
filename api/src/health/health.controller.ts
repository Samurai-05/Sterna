import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { MinioHealthIndicator } from './minio.health';

/**
 * This route is @Public(), and Terminus puts the underlying driver error
 * straight into the body — `connect ECONNREFUSED minio:9000` names an
 * internal host and port to anyone who asks. The status of each indicator is
 * what the Compose healthcheck and the deploy poll actually need; the message
 * is for a developer, so it is kept outside production and dropped inside it.
 */
function redactInProduction(error: unknown): unknown {
  if (
    process.env.NODE_ENV !== 'production' ||
    !(error instanceof ServiceUnavailableException)
  ) {
    return error;
  }

  const body = error.getResponse() as HealthCheckResult;

  const statusOnly = (
    checks: Partial<HealthIndicatorResult> | undefined,
  ): HealthIndicatorResult =>
    Object.fromEntries(
      Object.entries(checks ?? {}).flatMap(([name, result]) =>
        result ? [[name, { status: result.status }]] : [],
      ),
    );

  return new ServiceUnavailableException({
    status: body.status,
    info: statusOnly(body.info),
    error: statusOnly(body.error),
    details: statusOnly(body.details),
  });
}

const upExample = { database: { status: 'up' }, storage: { status: 'up' } };

const healthExample = {
  status: 'ok',
  info: upExample,
  error: {},
  details: upExample,
};

/**
 * GET /api/health
 *
 * Answers whether the API is serving *and* whether its dependencies are
 * reachable. Consumed by the Docker Compose healthcheck and by the deployment
 * pipeline: a process that is alive but cannot reach Postgres must not report
 * itself as healthy.
 */
@ApiTags('health')
// The Compose healthcheck and the deploy job's readiness poll carry no token,
// so the whole controller opts out of the global guard.
@Public()
// Polled by the Compose healthcheck every 10s from inside the container and
// by the deploy job until it reports healthy — a rate limit here would fail
// the deployment rather than protect anything.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly storage: MinioHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness and dependency check',
    description:
      'Pings every dependency of the API. Reachability only: it does not verify ' +
      'that migrations have run or that the PostGIS extension is enabled.',
  })
  @ApiOkResponse({
    description: 'Every check passed.',
    schema: { example: healthExample },
  })
  @ApiServiceUnavailableResponse({
    description:
      'At least one dependency is unreachable; `error` names which. Outside ' +
      'production the indicator message is included, as in the example ' +
      'below; in production it is dropped — see redactInProduction().',
    schema: {
      example: {
        status: 'error',
        info: { database: { status: 'up' } },
        error: {
          storage: {
            status: 'down',
            message: 'connect ECONNREFUSED minio:9000',
          },
        },
        details: {
          database: { status: 'up' },
          storage: {
            status: 'down',
            message: 'connect ECONNREFUSED minio:9000',
          },
        },
      },
    },
  })
  async check(): Promise<HealthCheckResult> {
    try {
      return await this.health.check([
        () => this.database.pingCheck('database'),
        () => this.storage.isHealthy('storage'),
      ]);
    } catch (error) {
      throw redactInProduction(error);
    }
  }
}
