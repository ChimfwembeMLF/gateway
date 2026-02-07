import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '../../common/enums/role-type.enum';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantService } from './tenant.service';
import { CreateTenantWithAdminDto } from './dto/create-tenant-with-admin.dto';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

@ApiTags('Tenants')
@Controller('api/v1/tenants')
@UseGuards(AuthGuard(), RolesGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}


  @Get('suggest-name/:name')
  @ApiBearerAuth()
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  async suggestTenantName(@Param('name') name: string) {
    return { suggestion: await this.tenantService.suggestTenantName(name) };
  }
  
  @Post('onboard')
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Tenant and admin user created' })
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  async createTenantWithAdmin(@Body() dto: CreateTenantWithAdminDto) {
    return this.tenantService.createTenantWithAdmin(dto);
  }


  @Get()
  @ApiBearerAuth()
  @Roles(RoleType.SUPER_ADMIN)
  async findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  async findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }


  @Patch(':id')
  @ApiBearerAuth()
  @Roles(RoleType.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }


  @Patch(':id/deactivate')
  @ApiBearerAuth()
  @Roles(RoleType.SUPER_ADMIN)
  async deactivate(@Param('id') id: string) {
    return this.tenantService.deactivate(id);
  }


  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleType.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    await this.tenantService.remove(id);
    return { success: true };
  }

  // Tenant API Key Management (uses tenant API key auth)
  @Get('api-key/view')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', description: 'Tenant API key', required: true })
  @ApiHeader({ name: 'x-tenant-id', description: 'Tenant identifier', required: true })
  @ApiResponse({ status: 200, description: 'Returns the tenant API key' })
  async viewApiKey(@Req() req: any) {
    return { 
      apiKey: req.tenant.apiKey,
      tenantId: req.tenant.id,
      tenantName: req.tenant.name
    };
  }

  @Post('api-key/regenerate')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', description: 'Current tenant API key', required: true })
  @ApiHeader({ name: 'x-tenant-id', description: 'Tenant identifier', required: true })
  @ApiResponse({ status: 200, description: 'Generates new API key for the tenant' })
  async regenerateApiKey(@Req() req: any) {
    const newApiKey = await this.tenantService.generateApiKey(req.tenant.id);
    return { 
      apiKey: newApiKey,
      message: 'API key regenerated successfully. Update your integrations with the new key.'
    };
  }
}
