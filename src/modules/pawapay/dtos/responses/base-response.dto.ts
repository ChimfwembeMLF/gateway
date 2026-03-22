import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto {
  @ApiProperty({ example: true, description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully', description: 'Response message' })
  message: string;

  @ApiProperty({ example: null, description: 'Optional data payload', required: false })
  data?: any;
}
