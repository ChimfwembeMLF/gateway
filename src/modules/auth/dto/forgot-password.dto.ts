import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email for password reset' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
