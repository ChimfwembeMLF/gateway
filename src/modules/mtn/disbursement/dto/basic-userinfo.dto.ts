import { ApiProperty } from '@nestjs/swagger';

export class BasicUserInfoDto {
  @ApiProperty({ example: 'John' })
  given_name: string;
  @ApiProperty({ example: 'Doe' })
  family_name: string;
  @ApiProperty({ example: '1990-01-01' })
  birthdate: string;
  @ApiProperty({ example: 'en' })
  locale: string;
  @ApiProperty({ example: 'male' })
  gender: string;
  @ApiProperty({ example: 'active' })
  status: string;
}
