import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res: any = exception.getResponse();
      const message = Array.isArray(res?.message) ? res.message : res?.message ?? exception.message;
      return response.status(status).json({
        statusCode: status,
        error: exception.name,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    return response.status(status).json({
      statusCode: status,
      error: 'InternalServerError',
      message: 'Une erreur interne est survenue.',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

