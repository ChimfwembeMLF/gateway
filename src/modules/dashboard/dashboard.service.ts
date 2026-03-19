import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Payment } from '../payments/entities/payment.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getDashboardSummary() {
    const [totalTenants, totalPayments, totalVolume, activeUsers] = await Promise.all([
      this.tenantRepository.count(),
      this.paymentRepository.count(),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'sum')
        .getRawOne()
        .then(res => Number(res.sum) || 0),
      this.userRepository.count({ where: { isActive: true } }),
    ]);
    return {
      totalTenants,
      totalPayments,
      totalVolume,
      activeUsers,
    };
  }
}
