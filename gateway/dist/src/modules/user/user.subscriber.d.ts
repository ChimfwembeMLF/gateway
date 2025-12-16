import { EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UserSubscriber implements EntitySubscriberInterface<User> {
    listenTo(): typeof User;
    beforeInsert(event: InsertEvent<User>): Promise<void>;
    beforeUpdate(event: UpdateEvent<User>): Promise<void>;
}
