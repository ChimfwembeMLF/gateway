import { Body, Controller, Post, Get, Query, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { DisbursementsService } from './disbursements.service';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';

@ApiTags('Disbursements')
@Controller('api/v1/disbursements')
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Disbursement created' })
  @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
  @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
  async create(@Body() createDisbursementDto: CreateDisbursementDto & { clientId?: string }, @Req() req: any): Promise<any> {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    if (!createDisbursementDto.network) throw new BadRequestException('Missing required field: network');
    if (!createDisbursementDto.recipient) throw new BadRequestException('Missing required field: recipient');
    if (!createDisbursementDto.clientId) throw new BadRequestException('Missing required field: clientId');
    return this.disbursementsService.create({ ...createDisbursementDto, tenantId, clientId: createDisbursementDto.clientId }, req.user);
  }

  // @Get()
  // @ApiResponse({ status: 200, description: 'List of disbursements' })
  // @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
  // @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
  // async findAll(@Query('clientId') clientId: string, @Req() req: any): Promise<any> {
  //   const tenantId = req.tenant?.id;
  //   if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
  //   return this.disbursementsService.findAll({ tenantId, clientId });
  // }
}
