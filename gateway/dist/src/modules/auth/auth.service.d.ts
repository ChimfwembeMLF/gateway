import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../user/users.service';
import { RoleType } from 'src/common/enums/role-type.enum';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(username: string, pass: string, tenantId: string): Promise<{
        tenantId: string;
        username: string;
        email?: string;
        phone?: string;
        isActive: boolean;
        firstName?: string;
        lastName?: string;
        profileImage?: string;
        role: RoleType;
        apiKey?: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    login(user: any): Promise<{
        access_token: string;
    }>;
    register(createUserDto: any): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            id: string;
            username: string;
            apiKey: string | undefined;
        };
    }>;
}
