import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
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
    @Query('auditableType') auditableType?: string,
    @Query('auditableId') auditableId?: string,
    @Query('userId') userId?: string,
  ): Promise<Audit[]> {
    const tenantId = req.tenant?.id;
    
    if (!tenantId) {
      throw new Error('Tenant not found in request');
    }

    if (auditableType && auditableId) {
      return this.auditService.findByEntity(auditableType, auditableId, tenantId);
    }
    // Optionally filter by userId
    if (userId) {
      return (await this.auditService.findAll(tenantId)).filter(a => a.userId === userId);
    }
    return this.auditService.findAll(tenantId);
  }
}
