import { AbstractEntity } from 'src/common/entities/abstract.entity';
import { RoleType } from 'src/common/enums/role-type.enum';
export declare class User extends AbstractEntity {
    tenantId: string;
    username: string;
    email?: string;
    phone?: string;
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    password: string;
    role: RoleType;
    apiKey?: string;
}
