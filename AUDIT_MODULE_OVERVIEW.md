### src/modules/audit/dto/create-audit.dto.ts
```typescript
export class CreateAuditDto {
  userId?: string;
  event: string;
  auditableType: string;
  auditableId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  url?: string;
  ipAddress?: string;
  userAgent?: string;
  tags?: string;
}
```
### src/modules/audit/dto/audit.dto.ts
```typescript
export class AuditDto {
  id: string;
  userId?: string;
  event: string;
  auditableType: string;
  auditableId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  url?: string;
  ipAddress?: string;
  userAgent?: string;
  tags?: string;
  createdAt: Date;
}
```
### src/common/middleware/audit-context.middleware.ts
```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Patch the queryRunner for this request
    const user = req['user'] as any; // Set by your auth guard/interceptor
    const ipAddress = req.ip || req.connection.remoteAddress;
    const url = req.originalUrl;
    const userAgent = req.headers['user-agent'];

    // Listen for a new queryRunner on this request
    const origCreateQueryRunner = this.dataSource.createQueryRunner.bind(this.dataSource);
    this.dataSource.createQueryRunner = (...args) => {
      const queryRunner = origCreateQueryRunner(...args);
      queryRunner.data = queryRunner.data || {};
      // Try to get userId from multiple possible fields
      queryRunner.data.userId = (user && (user.id || user.userId || user.sub)) || null;
      queryRunner.data.ipAddress = ipAddress;
      queryRunner.data.url = url;
      queryRunner.data.userAgent = userAgent;
      // You can add tags or other context here
      return queryRunner;
    };
    next();
  }
}
```
### src/modules/audit/entities/audit.entity.ts
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audits')
@Index(['auditableType', 'auditableId'])
@Index(['userId'])
export class Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column()
  event: string; // created, updated, deleted

  @Column()
  auditableType: string; // Entity name

  @Column()
  auditableId: string; // Entity id

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  tags: string;

  @CreateDateColumn()
  createdAt: Date;
}
```
### src/modules/audit/audit.subscriber.ts
```typescript
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm';
import { Audit } from './entities/audit.entity';

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  listenTo() {
    return Object;
  }

  async afterInsert(event: InsertEvent<any>) {
    if (event.entity && event.metadata.name !== 'Audit') {
      const context = event.queryRunner?.data || {};
      const audit = event.manager.create(Audit, {
        event: 'created',
        auditableType: event.metadata.name,
        auditableId: event.entity.id,
        newValues: event.entity,
        userId: context.userId,
        url: context.url,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        tags: context.tags,
      });
      await event.manager.save(Audit, audit);
    }
  }

  async afterUpdate(event: UpdateEvent<any>) {
    if (event.entity && event.metadata.name !== 'Audit') {
      const context = event.queryRunner?.data || {};
      const audit = event.manager.create(Audit, {
        event: 'updated',
        auditableType: event.metadata.name,
        auditableId: event.entity.id,
        oldValues: event.databaseEntity,
        newValues: event.entity,
        userId: context.userId,
        url: context.url,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        tags: context.tags,
      });
      await event.manager.save(Audit, audit);
    }
  }

  async afterRemove(event: RemoveEvent<any>) {
    if (event.entityId && event.metadata.name !== 'Audit') {
      const context = event.queryRunner?.data || {};
      const audit = event.manager.create(Audit, {
        event: 'deleted',
        auditableType: event.metadata.name,
        auditableId: event.entityId,
        oldValues: event.databaseEntity,
        userId: context.userId,
        url: context.url,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        tags: context.tags,
      });
      await event.manager.save(Audit, audit);
    }
  }
}
```
### src/modules/audit/audit.service.ts
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Audit } from './entities/audit.entity';
import { CreateAuditDto } from './dto/create-audit.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(Audit)
    private readonly auditRepository: Repository<Audit>,
  ) {}

  async create(createAuditDto: CreateAuditDto): Promise<Audit> {
    const audit = this.auditRepository.create(createAuditDto);
    return this.auditRepository.save(audit);
  }

  async findAll(): Promise<Audit[]> {
    return this.auditRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findByEntity(auditableType: string, auditableId: string): Promise<Audit[]> {
    return this.auditRepository.find({
      where: { auditableType, auditableId },
      order: { createdAt: 'DESC' },
    });
  }
}
```
### src/modules/audit/audit.module.ts
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Audit } from './entities/audit.entity';
import { AuditService } from './audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([Audit])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
```
# Audit Module Implementation Overview

This document provides an overview of the files and their implementation for the Audit module, including the subscriber and related components.

## Directory Structure

```
src/modules/audit/
  audit.controller.ts
  audit.module.ts
  audit.service.ts
  audit.subscriber.ts
  dto/
    audit.dto.ts
    create-audit.dto.ts
  entities/
    audit.entity.ts
src/common/middleware/
  audit-context.middleware.ts
```

## File Descriptions

### audit.controller.ts
- Exposes REST endpoints for audit-related operations (e.g., fetching audit logs).
- Handles incoming HTTP requests and delegates business logic to the service layer.

### audit.module.ts
- Declares and wires up the audit controller, service, and subscriber.
- Registers providers and imports required modules.

### audit.service.ts
- Contains business logic for creating and retrieving audit records.
- Interacts with the audit entity and database.

### audit.subscriber.ts
- Listens to database events (e.g., entity changes) and automatically creates audit logs.
- Implements logic to capture and persist audit information on relevant entity events.

### dto/audit.dto.ts
- Data Transfer Object for representing audit records in API responses.

### dto/create-audit.dto.ts
- DTO for creating new audit records (input validation, structure).

### entities/audit.entity.ts
- TypeORM entity definition for the Audit table.
- Defines columns and relationships for audit records.

### common/middleware/audit-context.middleware.ts
- Express/NestJS middleware that attaches request context (user, IP, URL, user agent) to the TypeORM query runner.
- Ensures that audit logs created by the subscriber include request-specific metadata.
- Should be applied globally or to relevant routes to capture context for auditing.

## Implementation Notes
- The subscriber ensures that audit logs are created automatically for relevant entity changes.
- The service provides methods for manual audit log creation and querying.
- DTOs ensure type safety and validation for API input/output.
- The module is self-contained and can be imported into the main application module.

### Middleware and Context Propagation
- The `AuditContextMiddleware` enriches audit logs by capturing request context (user, IP, URL, user agent) and making it available to the audit subscriber via the TypeORM query runner.
- This enables detailed and user-aware audit trails for all relevant entity changes.

This overview summarizes the structure and purpose of each file in the Audit module, including the subscriber and DTOs.

---

## File Contents Reference

### src/modules/audit/audit.controller.ts
```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Audit } from './entities/audit.entity';
// import { RolesGuard } from '../common/guards/roles.guard';
// import { Roles } from '../common/decorators/roles.decorator';
// import { RoleType } from '../common/enums/role-type.enum';

@Controller('audit')
// @UseGuards(RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // @Roles(RoleType.SUPER_ADMIN)
  @Get()
  async findAll(
    @Query('auditableType') auditableType?: string,
    @Query('auditableId') auditableId?: string,
    @Query('userId') userId?: string,
  ): Promise<Audit[]> {
    if (auditableType && auditableId) {
      return this.auditService.findByEntity(auditableType, auditableId);
    }
    // Optionally filter by userId
    if (userId) {
      return (await this.auditService.findAll()).filter(a => a.userId === userId);
    }
    return this.auditService.findAll();
  }
}
```