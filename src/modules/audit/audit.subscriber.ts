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
