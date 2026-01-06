import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Audit } from './entities/audit.entity';
// import { RolesGuard } from '../common/guards/roles.guard';
// import { Roles } from '../common/decorators/roles.decorator';
// import { RoleType } from '../common/enums/role-type.enum';

@Controller('audit')
// @UseGuards(RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // @Roles(RoleType.SUPER_ADMIN)
  @Get()
  async findAll(
    @Query('auditableType') auditableType?: string,
    @Query('auditableId') auditableId?: string,
    @Query('userId') userId?: string,
  ): Promise<Audit[]> {
    if (auditableType && auditableId) {
      return this.auditService.findByEntity(auditableType, auditableId);
    }
    // Optionally filter by userId
    if (userId) {
      return (await this.auditService.findAll()).filter(a => a.userId === userId);
    }
    return this.auditService.findAll();
  }
}
