import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { UsersService } from '../user/users.service';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User])],
  providers: [TenantService, UsersService],
  controllers: [TenantController],
  exports: [TenantService],
})
export class TenantModule {}
