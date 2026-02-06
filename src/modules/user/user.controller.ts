
import { Controller, Get, Post, Put, Delete, Param, Body, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserDto } from './dto/user.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { RoleType } from '../../common/enums/role-type.enum';

@ApiTags('Users')
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UsersService) {}

  @Get()
  @Auth([RoleType.ADMIN])
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, type: [UserDto] })
  async findAll(@Req() req: any): Promise<UserDto[]> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    const users = await this.userService.findAll(tenantId);
    return users.map(u => new UserDto(u));
  }

  @Get(':id')
  @Auth([RoleType.ADMIN])
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: UserDto })
  async findOne(@Param('id') id: string, @Req() req: any): Promise<UserDto | null> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    const user = await this.userService.findById(id, tenantId);
    if (!user) throw new ForbiddenException('User not found or access denied.');
    return new UserDto(user);
  }

  @Post()
  @Auth([RoleType.ADMIN])
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, type: UserDto })
  async create(@Body() data: RegisterDto, @Req() req: any): Promise<UserDto> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    const user = await this.userService.createUser({ ...data, tenantId });
    return new UserDto(user);
  }

  @Put(':id')
  @Auth([RoleType.ADMIN])
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: UserDto })
  async update(@Param('id') id: string, @Body() data: Partial<RegisterDto>, @Req() req: any): Promise<UserDto | null> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    const user = await this.userService.update(id, data, tenantId);
    if (!user) throw new ForbiddenException('User not found or access denied.');
    return new UserDto(user);
  }

  @Delete(':id')
  @Auth([RoleType.ADMIN])
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204 })
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    await this.userService.remove(id, tenantId);
  }

}

