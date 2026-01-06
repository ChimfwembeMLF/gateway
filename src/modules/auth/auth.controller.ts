import { Get, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
    const user = await this.authService.validateUserByEmail(body.email, body.password);
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }
    return { success: true, data: await this.authService.login(user) };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<BaseResponseDto> {
    return this.authService.register(registerDto);
  }

  @Get('me')
  @ApiBearerAuth()
  async getMe(@Req() req: Request) {
    // Expecting token in Authorization header as 'Bearer <token>'
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return { success: false, message: 'No token provided' };
    }
    const token = authHeader.replace('Bearer ', '');
    return this.authService.getUserByToken(token);
  }
}
