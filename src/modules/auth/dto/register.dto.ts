import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
	@ApiProperty({ description: 'Tenant name' })
	@IsString()
	@IsNotEmpty()
	tenantName: string;

	// @ApiProperty({ description: 'Tenant description', required: false })
	// @IsString()
	// description?: string;

	@ApiProperty({ description: 'Admin username' })
	@IsString()
	@IsNotEmpty()
	username: string;

	@ApiProperty({ description: 'Admin email' })
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ description: 'Admin password' })
	@IsString()
	@IsNotEmpty()
	password: string;
}