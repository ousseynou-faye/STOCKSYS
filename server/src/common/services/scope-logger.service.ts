import { Injectable } from '@nestjs/common';
import { ObservabilityService } from './observability.service.js';

type ScopeContext = {
  domain: string;
  userId?: string;
  username?: string;
  requestedStoreId?: string;
  enforcedStoreId?: string;
  reason?: string;
  data?: Record<string, any>;
  traceId?: string;
};

@Injectable()
export class ScopeLoggerService {
  constructor(private observability: ObservabilityService) {}

  async logOverride(ctx: ScopeContext) {
    await this.observability.emitScope({
      event: 'scope_override',
      level: 'warn',
      domain: ctx.domain,
      userId: ctx.userId,
      username: ctx.username,
      requestedStoreId: ctx.requestedStoreId,
      enforcedStoreId: ctx.enforcedStoreId,
      reason: ctx.reason,
      data: ctx.data,
      traceId: (ctx as any)?.traceId,
    });
  }

  async logViolation(ctx: ScopeContext) {
    await this.observability.emitScope({
      event: 'scope_violation',
      level: 'error',
      domain: ctx.domain,
      userId: ctx.userId,
      username: ctx.username,
      requestedStoreId: ctx.requestedStoreId,
      enforcedStoreId: ctx.enforcedStoreId,
      reason: ctx.reason,
      data: ctx.data,
      traceId: (ctx as any)?.traceId,
    });
  }
}
