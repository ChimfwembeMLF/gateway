import { AuthService } from './auth.service';
import { BaseResponseDto } from '../../common/dtos/base-response.dto';
import { UsersService } from '../user/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    private readonly userService;
    constructor(authService: AuthService, userService: UsersService);
    login(body: LoginDto): Promise<BaseResponseDto>;
    register(registerDto: RegisterDto): Promise<BaseResponseDto>;
}
