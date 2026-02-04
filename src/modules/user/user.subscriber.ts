import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo() {
    return User;
  }

  async beforeInsert(event: InsertEvent<User>) {
    if (event.entity && event.entity.password) {
      event.entity.password = await bcrypt.hash(event.entity.password, 10);
    }
  }

  async beforeUpdate(event: UpdateEvent<User>) {
    if (event.entity && event.entity.password && event.entity.password !== event.databaseEntity.password) {
      event.entity.password = await bcrypt.hash(event.entity.password, 10);
    }
  }
}
