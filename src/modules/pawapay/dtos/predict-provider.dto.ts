import { ApiProperty } from '@nestjs/swagger';

export class PredictProviderDto {
  @ApiProperty({ example: '+260971234567', description: 'MSISDN to predict provider for' })
  msisdn: string;

  @ApiProperty({ example: 'ZMW', description: 'Currency code' })
  currency: string;
}
