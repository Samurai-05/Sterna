import { Controller, Get } from '@nestjs/common';
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
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { MinioHealthIndicator } from './minio.health';

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
    description: 'At least one dependency is unreachable; `error` names which.',
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
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.database.pingCheck('database'),
      () => this.storage.isHealthy('storage'),
    ]);
  }
}
