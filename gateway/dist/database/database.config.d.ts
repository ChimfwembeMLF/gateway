import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
export declare function typeOrmConfigFactory(configService: ConfigService): TypeOrmModuleOptions;
