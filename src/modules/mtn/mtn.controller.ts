import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiParam, ApiResponse } from '@nestjs/swagger';
import { MtnService } from './mtn.service';
import { MTNInfoResponseDto } from './dto/mtn-info.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { BaseResponseDto } from '../../common/dtos/base-response.dto';
import { RequestToPayDto } from './dto/request-to-pay.dto';

@ApiTags('MTN')
@Controller('api/v1/mtn')
@Auth()
export class MtnController {
  constructor(private readonly mtnService: MtnService) {}


  @Post('apiuser')
  async createApiUser(): Promise<BaseResponseDto> {
    const result = await this.mtnService.createApiUser();
    return { success: true, data: result };
  }

  @Post('apikey/:referenceId')
  async createApiKey(@Param('referenceId') referenceId: string): Promise<BaseResponseDto> {
    const result = await this.mtnService.createApiKey(referenceId);
    return { success: true, data: result };
  }

  @Post('token')
  async createBearerToken(@Body() body: { referenceId: string; apiKey: string }): Promise<BaseResponseDto> {
    const token = await this.mtnService.createBearerToken(body.referenceId, body.apiKey);
    return { success: true, data: { access_token: token } };
  }

  @Post('requesttopay')
  async requestToPay(@Body() body: { dto: RequestToPayDto; bearerToken: string; transactionId: string }): Promise<BaseResponseDto> {
    const result = await this.mtnService.requestToPay(body.dto, body.bearerToken, body.transactionId);
    return { success: true, data: result };
  }

  @Get('requestopay/:transactionId/status')
  async getRequestToPayStatus(@Param('transactionId') transactionId: string, @Body('bearerToken') bearerToken: string): Promise<BaseResponseDto> {
    const result = await this.mtnService.getRequestToPayStatus(transactionId, bearerToken);
    return { success: true, data: result };
  }

  @Get('getClientDetails/:phone')
  @ApiParam({ name: 'phone', description: 'Zambian MTN mobile number', example: '0961234567' })
  @ApiResponse({ status: 200, type: MTNInfoResponseDto })
  async getClientDetails(@Param('phone') phone: string): Promise<MTNInfoResponseDto> {
    if (!/^(076|096)\d{7}$/.test(phone)) {
      throw new HttpException('Invalid phone number format', HttpStatus.BAD_REQUEST);
    }
    const data = await this.mtnService.fetchUserBasicDetails(phone);
    return { name: data.name, status: data.status, message: data.message };
  }
}
