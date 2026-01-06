import { Controller, Get, Post, Body, Param, HttpException, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiParam, ApiResponse, ApiBody, ApiOperation } from '@nestjs/swagger';
import { MtnService } from './mtn.service';
import { MTNInfoResponseDto } from './dto/mtn-info.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { BaseResponseDto } from '../../common/dtos/base-response.dto';
import { RequestToPayDto } from './dto/mtn.dto';
import { RequestToPayResultDto, ErrorReasonDto, PartyDto } from './dto/mtn.dto';

@ApiTags('MTN')
@Controller('api/v1/mtn')
@Auth()
export class MtnController {
  constructor(private readonly mtnService: MtnService) {}


  @Post('apiuser')
  async createApiUser(@Req() req: any): Promise<BaseResponseDto> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    const result = await this.mtnService.createApiUser(tenantId);
    return { success: true, data: result };
  }

  @Post('apikey/:referenceId')
  async createApiKey(@Param('referenceId') referenceId: string, @Req() req: any): Promise<BaseResponseDto> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    const result = await this.mtnService.createApiKey(referenceId, tenantId);
    return { success: true, data: result };
  }

  @Post('token')
  async createBearerToken(@Body() body: { referenceId: string; apiKey: string }, @Req() req: any): Promise<BaseResponseDto> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    const token = await this.mtnService.createBearerToken(body.referenceId, body.apiKey, tenantId);
    return { success: true, data: { access_token: token } };
  }



  @Get('getClientDetails/:phone')
  @ApiParam({ name: 'phone', description: 'Zambian MTN mobile number', example: '0961234567' })
  @ApiResponse({ status: 200, type: MTNInfoResponseDto })
  async getClientDetails(@Param('phone') phone: string, @Req() req: any): Promise<MTNInfoResponseDto> {
    if (!/^(076|096)\d{7}$/.test(phone)) {
      throw new HttpException('Invalid phone number format', HttpStatus.BAD_REQUEST);
    }
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new HttpException('Missing tenantId in request.', HttpStatus.BAD_REQUEST);
    const data = await this.mtnService.fetchUserBasicDetails(phone, tenantId);
    return { name: data.name, status: data.status, message: data.message };
  }
}
