<<<<<<< HEAD
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
=======
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject, Logger } from '@nestjs/common';
import { ObservabilityService, LogPayload } from '../services/observability.service.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  constructor(@Inject(ObservabilityService) private observability: ObservabilityService) {}

>>>>>>> 7884868 (STOCKSYS)
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

<<<<<<< HEAD
=======
    const basePayload = {
      path: request.url,
      method: request.method,
      userId: request.user?.sub,
      username: request.user?.username,
      traceId: request.traceId,
    };

>>>>>>> 7884868 (STOCKSYS)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res: any = exception.getResponse();
      const message = Array.isArray(res?.message) ? res.message : res?.message ?? exception.message;
<<<<<<< HEAD
=======
      const payload: LogPayload = {
        ...basePayload,
        status,
        message,
        event: 'api_error',
        level: status >= 500 ? 'error' : 'warn',
      };
      this.observability.emitApiError(payload).catch(() => this.logger.warn('Failed to emit api_error'));
>>>>>>> 7884868 (STOCKSYS)
      return response.status(status).json({
        statusCode: status,
        error: exception.name,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
<<<<<<< HEAD
    return response.status(status).json({
      statusCode: status,
      error: 'InternalServerError',
      message: 'Une erreur interne est survenue.',
=======
    const message = 'Une erreur interne est survenue.';
    this.observability
      .emitApiError({
        ...basePayload,
        status,
        message,
        event: 'api_error',
        level: 'error',
      })
      .catch(() => this.logger.warn('Failed to emit api_error'));

    return response.status(status).json({
      statusCode: status,
      error: 'InternalServerError',
      message,
>>>>>>> 7884868 (STOCKSYS)
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
<<<<<<< HEAD

=======
>>>>>>> 7884868 (STOCKSYS)
