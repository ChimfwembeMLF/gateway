import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

export class ActiveConfigurationResponseDto extends BaseResponseDto {
  @ApiProperty({ example: { configKey: 'value' }, description: 'Active configuration object' })
  config: any;
}
