import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Audit } from './entities/audit.entity';
import { AuditService } from './audit.service';
import { AuditCleanupService } from './audit-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([Audit])],
  providers: [AuditService, AuditCleanupService],
  exports: [AuditService],
})
export class AuditModule {}
