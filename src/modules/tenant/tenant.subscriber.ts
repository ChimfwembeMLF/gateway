import { EventSubscriber, EntitySubscriberInterface, InsertEvent } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { randomBytes } from 'crypto';

@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface<Tenant> {
  listenTo() {
    return Tenant;
  }

  async beforeInsert(event: InsertEvent<Tenant>) {
    // Auto-generate slug if not provided
    if (event.entity && !event.entity.slug && event.entity.name) {
      let baseSlug = event.entity.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      let slug = baseSlug;
      let i = 1;
      const repo = event.manager.getRepository(Tenant);
      while (await repo.findOne({ where: { slug } })) {
        slug = `${baseSlug}-${i}`;
        i++;
      }
      event.entity.slug = slug;
    }

    // Auto-generate API key if not provided
    if (event.entity && !event.entity.apiKey) {
      event.entity.apiKey = `tenant_${randomBytes(32).toString('hex')}`;
    }
  }
}
