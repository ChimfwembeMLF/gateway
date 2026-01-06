import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../../user/users.service';
import { TenantService } from '../../tenant/tenant.service';
import { RoleType } from 'src/common/enums/role-type.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserByEmail(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) return null;

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) return null;

    const { password, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role ?? RoleType.USER,
      tenantId: user.tenantId, // Add tenantId to JWT payload
    };

    // Remove password from user object if present
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: any) {
    const { tenantName, description, username, email, password } = registerDto;

    const userExists =
      await this.usersService.findByUsernameOrEmail(username, email);

    if (userExists) {
      return {
        success: false,
        message: 'Username or email already exists',
      };
    }

    // Use TenantService to create tenant and admin
    const { tenant, admin } =
      await this.tenantService.createTenantWithAdmin({
        name: tenantName,
        description,
        adminUsername: username,
        adminEmail: email,
        adminPassword: password,
      });

    return {
      success: true,
      message: 'Tenant and admin user created successfully',
      data: { tenant, admin },
    };
  }

    async getUserByToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub, payload.tenantId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      const { password, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    } catch (e) {
      return { success: false, message: 'Invalid or expired token' };
    }
  }
}
