import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();

    return next.handle().pipe(
      tap({
        next: () => {
          const user = (req as FastifyRequest & { user?: AuthenticatedUser }).user;
          if (user?.sub) {
            req.log.info({ userSub: user.sub }, 'authenticated request completed');
          }
        },
      }),
    );
  }
}
