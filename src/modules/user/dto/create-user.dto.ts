import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';
import { RoleType } from '../../../common/enums/role-type.enum';

export class CreateUserDto {
  // @IsString()
  // @IsNotEmpty()
  // readonly username: string;

  @IsString()
  @IsOptional()
  readonly firstName?: string;

  @IsString()
  @IsOptional()
  readonly lastName?: string;

  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @IsString()
  @IsOptional()
  readonly password?: string;

  @IsOptional()
  readonly role?: RoleType;
}