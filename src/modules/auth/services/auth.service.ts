import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../../user/users.service';
import { TenantService } from '../../tenant/tenant.service';

import { RoleType } from 'src/common/enums/role-type.enum';
import { EmailService } from '../../email/services/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}
  /**
   * Handle forgot password: generate OTP, store, and send to email
   */
  async forgotPassword(email: string) {
    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { success: false, message: 'User with this email does not exist' };
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Set expiry (e.g., 10 minutes from now)
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP and expiry on user
    await this.usersService.update(user.id, { otpCode, otpExpires }, user.tenantId);

    // Send OTP to user's email
    const subject = 'Your Password Reset Code';
    const html = `<p>Hello,</p><p>Your password reset code is: <b>${otpCode}</b></p><p>This code will expire in 10 minutes.</p>`;

    try {
      if (!user.email) {
        return { success: false, message: 'User does not have a valid email address' };
      }
      await this.emailService.getProvider().send({
        to: user.email as string,
        subject,
        html,
      });
    } catch (error) {
      return { success: false, message: 'Failed to send OTP email', error: error.message };
    }

    return { success: true, message: 'OTP sent to email' };
  }

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

    // Generate API key for the tenant
    const apiKey = await this.tenantService.generateApiKey(tenant.id);

    // Generate JWT token for the admin user
    const payload = {
      sub: admin.id,
      username: admin.username,
      role: admin.role,
      tenantId: admin.tenantId,
    };
    const token = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'Tenant and admin user created successfully',
      data: { 
        tenant, 
        admin,
        token,
      },
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
