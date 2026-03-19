import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '../../common/enums/role-type.enum';
import { DashboardService } from './dashboard.service';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('api/v1/admin/dashboard')
@UseGuards(AuthGuard(), RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(RoleType.SUPER_ADMIN)
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard summary',
    schema: {
      example: {
        totalTenants: 10,
        totalPayments: 100,
        totalVolume: 50000,
        activeUsers: 25,
      },
    },
  })
  async getDashboard() {
    return this.dashboardService.getDashboardSummary();
  }
}
