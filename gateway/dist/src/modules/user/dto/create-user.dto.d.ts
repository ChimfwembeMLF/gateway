import { AbstractDto } from '../../../common/dtos/abstract.dto';
import { RoleType } from '../../../common/enums/role-type.enum';
export declare class CreateUserDto extends AbstractDto {
    username: string;
    password: string;
    role?: RoleType;
}
