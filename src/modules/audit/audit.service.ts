import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findAll(tenantId: string): Promise<Audit[]> {
    return this.auditRepository.find({ 
      where: { tenantId },
      order: { createdAt: 'DESC' } 
    });
  }

  async findByEntity(auditableType: string, auditableId: string, tenantId: string): Promise<Audit[]> {
    return this.auditRepository.find({
      where: { auditableType, auditableId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }
}
