import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UserHashPasswordInterceptor } from './user.interceptor';
import { BaseResponseDto } from '../../common/dtos/base-response.dto';
import { UsersService } from '../user/users.service';
import { RoleType } from 'src/common/enums/role-type.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,

  ) {}
  

  @Post('login')
  async login(@Body() body: LoginDto): Promise<BaseResponseDto> {
    if (!body.tenantId) {
      return { success: false, message: 'tenantId is required' };
    }
    const user = await this.authService.validateUser(body.username, body.password, body.tenantId);
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }
    return { success: true, data: await this.authService.login(user) };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<BaseResponseDto> {
    return this.authService.register(registerDto);
  }
}
