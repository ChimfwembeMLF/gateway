import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
	@ApiProperty({ description: 'Unique username for the user' })
	@IsString()
	@IsNotEmpty()
	username: string;

	@ApiProperty({ description: 'User email address' })
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ description: 'Password' })
	@IsString()
	@IsNotEmpty()
	password: string;
}