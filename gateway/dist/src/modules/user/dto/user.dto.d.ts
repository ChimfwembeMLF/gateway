import { AbstractDto } from "src/common/dtos/abstract.dto";
export declare class UserDto extends AbstractDto {
    username: string;
    email?: string;
    phone?: string;
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    role: string;
    constructor(user: any);
}
