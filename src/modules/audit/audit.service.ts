import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../../common/dtos/paginated-response.dto';
import { BaseQueryDto } from '../../common/dtos/base-query.dto';
import { Audit } from './entities/audit.entity';
import { CreateAuditDto } from './dto/create-audit.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(Audit)
    private readonly auditRepository: Repository<Audit>,
  ) {}

  async create(createAuditDto: CreateAuditDto): Promise<Audit> {
    const audit = this.auditRepository.create(createAuditDto);
    return this.auditRepository.save(audit);
  }

  async findAll(): Promise<Audit[]> {
    return this.auditRepository.find({
      order: { createdAt: 'DESC' } 
    });
  }

    async findTenantAll(tenantId: string, page = 1, pageSize = 10): Promise<PaginatedResponseDto<Audit>> {
      const [data, total] = await this.auditRepository.findAndCount({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return {
        success: true,
        total,
        page,
        pageSize,
        data,
      };
    }

    async findAllPaginated(page = 1, pageSize = 10): Promise<PaginatedResponseDto<Audit>> {
      const [data, total] = await this.auditRepository.findAndCount({
        order: { createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return {
        success: true,
        total,
        page,
        pageSize,
        data,
      };
    }

  async findByEntity(auditableType: string, auditableId: string, tenantId: string): Promise<Audit[]> {
    return this.auditRepository.find({
      where: { auditableType, auditableId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }
}
