import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { AbstractDto } from '../../../common/dtos/abstract.dto';
import { RoleType } from '../../../common/enums/role-type.enum';

export class CreateUserDto extends AbstractDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ enum: RoleType, default: RoleType.USER })
  @IsOptional()
  role?: RoleType = RoleType.USER;
}
