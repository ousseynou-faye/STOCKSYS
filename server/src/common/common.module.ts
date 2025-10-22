import { Global, Module } from '@nestjs/common';
import { AuditNotifyService } from './services/audit-notify.service.js';

@Global()
@Module({ providers: [AuditNotifyService], exports: [AuditNotifyService] })
export class CommonModule {}

