import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

class ProviderStatus {
  @ApiProperty({ example: 'MTN' })
  provider: string;

  @ApiProperty({ example: true })
  available: boolean;
}

export class ProviderAvailabilityResponseDto extends BaseResponseDto {
  @ApiProperty({ type: [ProviderStatus] })
  providers: ProviderStatus[];
}
