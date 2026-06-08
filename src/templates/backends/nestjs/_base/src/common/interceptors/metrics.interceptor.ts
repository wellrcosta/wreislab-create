import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const res = context.switchToHttp().getResponse<FastifyReply>();

    const method = req.method;
    const path = (req as FastifyRequest & { routerPath?: string }).routerPath ?? req.url;
    const startTime = Date.now();

    this.metricsService.requestsInFlight.inc();

    const record = () => {
      const statusCode = String(res.statusCode);
      const durationSeconds = (Date.now() - startTime) / 1000;

      this.metricsService.requestsInFlight.dec();
      this.metricsService.requestsTotal.inc({ method, path, status_code: statusCode });
      this.metricsService.requestDuration.observe(
        { method, path, status_code: statusCode },
        durationSeconds,
      );
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}
