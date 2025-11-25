import { Global, Module } from '@nestjs/common';
import { AuditNotifyService } from './services/audit-notify.service.js';
<<<<<<< HEAD

@Global()
@Module({ providers: [AuditNotifyService], exports: [AuditNotifyService] })
export class CommonModule {}

=======
import { ScopeLoggerService } from './services/scope-logger.service.js';
import { ObservabilityService } from './services/observability.service.js';

@Global()
@Module({
  providers: [AuditNotifyService, ScopeLoggerService, ObservabilityService],
  exports: [AuditNotifyService, ScopeLoggerService, ObservabilityService],
})
export class CommonModule {}
>>>>>>> 7884868 (STOCKSYS)
