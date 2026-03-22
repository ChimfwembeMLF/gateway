import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

export class PredictProviderResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'MTN', description: 'Predicted provider' })
  provider: string;
}
