import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantService } from './tenant.service';
import { CreateTenantWithAdminDto } from './dto/create-tenant-with-admin.dto';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('Tenants')
@Controller('api/v1/tenants')
@UseGuards(AdminGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('onboard')
  @ApiResponse({ status: 201, description: 'Tenant and admin user created' })
  async createTenantWithAdmin(@Body() dto: CreateTenantWithAdminDto) {
    return this.tenantService.createTenantWithAdmin(dto);
  }

  @Get()
  async findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.tenantService.deactivate(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.tenantService.remove(id);
    return { success: true };
  }
}
