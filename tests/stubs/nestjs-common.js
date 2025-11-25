export class BadRequestException extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestException';
  }
}

export class NotFoundException extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundException';
  }
}

<<<<<<< HEAD
export function Injectable() {
  return function () {
    /* noop decorator */
  };
}
=======
function decoratorFactory() {
  return function (..._args) { /* noop */ };
}
export function Injectable() { return decoratorFactory(); }
export function Controller() { return decoratorFactory(); }
export function Module() { return decoratorFactory(); }
export function Global() { return decoratorFactory(); }
export function SetMetadata() { return decoratorFactory(); }
export function UseGuards() { return decoratorFactory(); }
export function Catch() { return decoratorFactory(); }
export function Req() { return decoratorFactory(); }
export function Body() { return decoratorFactory(); }
export function Get() { return decoratorFactory(); }
export function Post() { return decoratorFactory(); }
export function Put() { return decoratorFactory(); }
export function Patch() { return decoratorFactory(); }
export function Delete() { return decoratorFactory(); }
export function Query() { return decoratorFactory(); }
export function Param() { return decoratorFactory(); }
export function HttpCode() { return decoratorFactory(); }
export function UseInterceptors() { return decoratorFactory(); }
export function UseFilters() { return decoratorFactory(); }
export function Inject() { return decoratorFactory(); }

export class Logger {
  constructor(..._args) {}
  log(..._args) {}
  warn(..._args) {}
  error(..._args) {}
  debug(..._args) {}
}

export class HttpException extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'HttpException';
  }
  getStatus() { return this.status; }
  getResponse() { return this.message; }
}

export const HttpStatus = {};

export class ExecutionContext {
  switchToHttp() {
    return {
      getRequest() { return {}; },
      getResponse() { return {}; },
    };
  }
}

export class CallHandler { handle() {} }
export class NestInterceptor {}
export class NestMiddleware {}
export class CanActivate { canActivate() { return true; } }
export class INestApplication { async close() {} }
export class OnModuleInit { async onModuleInit() {} }
>>>>>>> 7884868 (STOCKSYS)
