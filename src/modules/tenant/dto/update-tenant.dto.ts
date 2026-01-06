import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateTenantDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  isActive?: boolean;
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  webhook_url?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  webhook_key?: string;
}
