import { AbstractDto } from "src/common/dtos/abstract.dto";
import { ApiProperty } from '@nestjs/swagger';

export class UserDto extends AbstractDto {
	@ApiProperty()
	username: string;

	@ApiProperty({ required: false })
	email?: string;

	@ApiProperty({ required: false })
	phone?: string;

	@ApiProperty({ required: false })
	isActive: boolean;

	@ApiProperty({ required: false })
	firstName?: string;

	@ApiProperty({ required: false })
	lastName?: string;

	@ApiProperty({ required: false })
	profileImage?: string;

	@ApiProperty()
	role: string;

	constructor(user: any) {
		super();
		this.id = user.id;
		this.username = user.username;
		this.email = user.email;
		this.phone = user.phone;
		this.isActive = user.isActive;
		this.firstName = user.firstName;
		this.lastName = user.lastName;
		this.profileImage = user.profileImage;
		this.role = user.role;
		this.createdAt = user.createdAt;
		this.updatedAt = user.updatedAt;
	}
}