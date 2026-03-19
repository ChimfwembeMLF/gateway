import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { BaseQueryDto } from '../../common/dtos/base-query.dto';
import { PaginatedResponseDto } from '../../common/dtos/paginated-response.dto';
import { AuditService } from './audit.service';
import { Audit } from './entities/audit.entity';
import { ApiKeyGuard } from 'src/common/guards/api-key.guard';
import { Request } from 'express';
// import { RolesGuard } from '../common/guards/roles.guard';
// import { Roles } from '../common/decorators/roles.decorator';
// import { RoleType } from '../common/enums/role-type.enum';

interface RequestWithTenant extends Request {
  tenant?: { id: string; name: string };
}

@Controller('audit')
@UseGuards(ApiKeyGuard)
// @UseGuards(RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // @Roles(RoleType.SUPER_ADMIN)
  @Get()
  async findAll(
    @Req() req: RequestWithTenant,
    @Query() query: BaseQueryDto,
    @Query('auditableType') auditableType?: string,
    @Query('auditableId') auditableId?: string,
    @Query('userId') userId?: string,
  ): Promise<PaginatedResponseDto<Audit>> {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new Error('Tenant not found in request');
    }
    // If filtering by entity
    if (auditableType && auditableId) {
      // Not paginated for now
      const data = await this.auditService.findByEntity(auditableType, auditableId, tenantId);
      return {
        success: true,
        total: data.length,
        page: query.page || 1,
        pageSize: query.pageSize || 10,
        data,
      };
    }
    // Optionally filter by userId
    if (userId) {
      const all = await this.auditService.findTenantAll(tenantId, query.page, query.pageSize);
      all.data = (all.data ?? []).filter(a => a.userId === userId);
      all.total = all.data.length;
      return all;
    }
    return this.auditService.findTenantAll(tenantId, query.page, query.pageSize);
  }
}
