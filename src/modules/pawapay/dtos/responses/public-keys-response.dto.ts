import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

export class PublicKeysResponseDto extends BaseResponseDto {
  @ApiProperty({ example: [{ keyId: 'abc', publicKey: '...' }], description: 'List of public keys' })
  keys: any[];
}
