import { CanActivate, ExecutionContext } from '@nestjs/common';
import { UsersService } from 'src/modules/user/users.service';
export declare class ApiKeyGuard implements CanActivate {
    private readonly usersService;
    constructor(usersService: UsersService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
