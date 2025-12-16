import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../user/users.service';
import { RoleType } from 'src/common/enums/role-type.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string, tenantId: string) {
    const user = await this.usersService.findByUsername(username, tenantId);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(createUserDto: any) {
    // Require tenantId for multi-tenancy
    const { username, password, role, tenantId } = createUserDto;
    if (!tenantId) {
      return { success: false, message: 'tenantId is required' };
    }
    // Check if user already exists in this tenant
    const existing = await this.usersService.findByUsername(username, tenantId);
    if (existing) {
      return { success: false, message: 'Username already exists' };
    }
    // Create user in DB
    const user = await this.usersService.createUser({
      username,
      password,
      role: role ?? RoleType.USER,
      tenantId,
    });
    return {
      success: true,
      message: 'Account created successfully',
      data: {
        id: user.id,
        username: user.username,
        apiKey: user.apiKey,
      }
    };
  }
}
