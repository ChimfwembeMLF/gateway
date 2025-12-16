import { UsersService } from './users.service';
import { UserDto } from './dto/user.dto';
import { RegisterDto } from '../auth/dto/register.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UsersService);
    findAll(req: any): Promise<UserDto[]>;
    findOne(id: string, req: any): Promise<UserDto | null>;
    create(data: RegisterDto, req: any): Promise<UserDto>;
    update(id: string, data: Partial<RegisterDto>, req: any): Promise<UserDto | null>;
    remove(id: string, req: any): Promise<void>;
    generateApiKey(id: string, req: any): Promise<{
        apiKey: string;
    }>;
}
