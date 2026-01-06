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

  async findAll(): Promise<Audit[]> {
    return this.auditRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findByEntity(auditableType: string, auditableId: string): Promise<Audit[]> {
    return this.auditRepository.find({
      where: { auditableType, auditableId },
      order: { createdAt: 'DESC' },
    });
  }
}
