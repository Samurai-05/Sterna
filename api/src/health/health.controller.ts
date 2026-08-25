import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

/**
 * GET /api/health
 *
 * Answers whether the API is serving *and* whether its dependencies are
 * reachable. Consumed by the Docker Compose healthcheck and by the deployment
 * pipeline: a process that is alive but cannot reach Postgres must not report
 * itself as healthy.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.pingCheck('database')]);
  }
}
