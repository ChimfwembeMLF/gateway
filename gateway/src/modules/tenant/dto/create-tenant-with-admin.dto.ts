import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantWithAdminDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adminUsername: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adminPassword: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  adminEmail?: string;
}