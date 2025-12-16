import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
	@ApiProperty({ description: 'Username or email' })
	@IsString()
	@IsNotEmpty()
	username: string;

	@ApiProperty({ description: 'Password' })
	@IsString()
	@IsNotEmpty()
	password: string;
    
	@ApiProperty({ description: 'Tenant ID' })
	@IsString()
	@IsNotEmpty()
	tenantId: string;
}
