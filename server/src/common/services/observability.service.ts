import { Injectable, Logger } from '@nestjs/common';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogPayload = {
  event: string;
  level?: LogLevel;
  message?: string;
  traceId?: string;
  domain?: string;
  userId?: string;
  username?: string;
  requestedStoreId?: string;
  enforcedStoreId?: string;
  path?: string;
  method?: string;
  status?: number;
  reason?: string;
  data?: Record<string, any>;
  stack?: string;
};

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger('Observability');
  private readonly webhookUrl = process.env.LOG_WEBHOOK_URL;
  private readonly environment = process.env.NODE_ENV || 'development';

  private logToConsole(payload: LogPayload) {
    const level = payload.level || 'info';
    const base = {
      event: payload.event,
      env: this.environment,
      traceId: payload.traceId,
      domain: payload.domain,
      userId: payload.userId,
      username: payload.username,
      requestedStoreId: payload.requestedStoreId,
      enforcedStoreId: payload.enforcedStoreId,
      path: payload.path,
      method: payload.method,
      status: payload.status,
      reason: payload.reason,
      message: payload.message,
      data: payload.data,
      stack: payload.stack,
    };
    const msg = JSON.stringify(base);
    if (level === 'error') return this.logger.error(msg);
    if (level === 'warn') return this.logger.warn(msg);
    if (level === 'debug') return this.logger.debug(msg);
    return this.logger.log(msg);
  }

  private async maybeSendWebhook(payload: LogPayload) {
    if (!this.webhookUrl) return;
    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: this.environment, ...payload }),
      });
    } catch (err) {
      this.logger.warn(`Failed to send log webhook: ${String(err)}`);
    }
  }

  async emit(payload: LogPayload) {
    this.logToConsole(payload);
    await this.maybeSendWebhook(payload);
  }

  async emitScope(payload: LogPayload) {
    await this.emit({ level: 'warn', ...payload, event: payload.event || 'scope_violation' });
  }

  async emitApiError(payload: LogPayload) {
    await this.emit({ level: payload.level || 'error', ...payload, event: payload.event || 'api_error' });
  }
}
