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

const healthExample = {
  status: 'ok',
  info: { database: { status: 'up' } },
  error: {},
  details: { database: { status: 'up' } },
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
        info: {},
        error: {
          database: { status: 'down', message: 'timeout of 1000ms exceeded' },
        },
        details: {
          database: { status: 'down', message: 'timeout of 1000ms exceeded' },
        },
      },
    },
  })
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.pingCheck('database')]);
  }
}
