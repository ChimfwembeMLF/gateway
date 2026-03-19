
import { UserDto } from '../user/dto/user.dto';
import { ApiOperation } from '@nestjs/swagger';
import { Controller, Get, Patch, Body, Query, Req, BadRequestException, Post } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RoleType } from '../../common/enums/role-type.enum';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { UsersService } from '../user/users.service';
import { RegisterDto } from '../auth/dto/register.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
    private readonly userService: UsersService,
  ) {}

  @Post('users')
  @Auth([RoleType.SUPER_ADMIN])
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiResponse({ status: 201, type: UserDto })
  async createUser(@Body() data: CreateUserDto, @Req() req: any): Promise<UserDto> {
    // Get tenantId from context (req.user)
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in context.');
    const user = await this.userService.createUser({ ...data, tenantId });
    return new UserDto(user);
  }

    @Patch('security-settings')
  @Auth([RoleType.SUPER_ADMIN])
  @ApiBody({
    schema: {
      example: {
        require2FA: true,
        passwordMinLength: 8,
        sessionTimeoutMinutes: 30,
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Security settings updated.' })
  async updateSecuritySettings(@Body() body: any) {
    // Update the 'security' settings using the settings service
    await this.settingsService.updateSettingsByName('security', body);
    return { success: true };
  }
  @Get('security-settings')
  @Auth([RoleType.SUPER_ADMIN])
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        require2FA: true,
        passwordMinLength: 8,
        sessionTimeoutMinutes: 30,
      },
    },
  })
  async getSecuritySettings() {
    const settings = await this.settingsService.getSettingsByName('security');
    return {
      require2FA: settings.require2FA,
      passwordMinLength: settings.passwordMinLength,
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    };
  }

    @Patch('general-settings')
  @Auth([RoleType.SUPER_ADMIN])
  @ApiBody({
    schema: {
      example: {
        siteName: 'My App',
        supportEmail: 'support@example.com',
        maintenanceMode: false,
      },
    },
  })
  @ApiResponse({ status: 200, description: 'General settings updated.' })
  async updateGeneralSettings(@Body() body: any) {
    await this.settingsService.updateSettingsByName('general', body);
    return { success: true };
  }
  
  @Get('audit-logs')
  @Auth([RoleType.SUPER_ADMIN])
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        data: [
          {
            event: 'Admin login',
            user: 'admin@example.com',
            date: '2026-03-15T10:23:00Z',
          },
          {
            event: 'Password changed',
            user: 'jane@company.com',
            date: '2026-03-14T18:02:00Z',
          },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
        pageCount: 1,
        success: true,
      },
    },
  })
  async getAuditLogs(@Req() req: any, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    // If super admin, show all logs paginated; else, filter by tenantId paginated
    const user = req.user;
    if (user.role === RoleType.SUPER_ADMIN) {
      return this.auditService.findAllPaginated(Number(page), Number(pageSize));
    } else {
      return this.auditService.findTenantAll(user.tenantId, Number(page), Number(pageSize));
    }
  }

  @Get('general-settings')
  @Auth([RoleType.SUPER_ADMIN])
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        defaultCurrency: 'USD',
        standardFeePercent: 2.5,
        notifyAdmins: true,
        notifyUsers: false,
      },
    },
  })
  async getGeneralSettings() {
    const settings = await this.settingsService.getSettingsByName('general');
    return {
      defaultCurrency: settings.defaultCurrency,
      standardFeePercent: settings.standardFeePercent,
      notifyAdmins: settings.notifyAdmins,
      notifyUsers: settings.notifyUsers,
    };
  }
}