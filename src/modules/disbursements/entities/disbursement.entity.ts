import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentProvider } from '../../../common/enums/provider.enum';
import { AbstractEntity } from 'src/common/entities/abstract.entity';
import { ZambiaNetwork } from 'src/common/enums/zambia-network.enum';

@Entity('disbursements')
export class Disbursement extends AbstractEntity {
  @Column()
  tenantId: string;

  @Column()
  clientId: string;

  @Column()
  externalId: string;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: number;

  @Column({ default: 'ZMW' })
  currency: string;

  @Column()
  recipient: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  recipientName?: string;

  @Column({ type: 'enum', enum: PaymentProvider, default: PaymentProvider.PAWAPAY })
  provider: PaymentProvider;

  @Column({ type: 'enum', enum: ZambiaNetwork })
  network: ZambiaNetwork;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ nullable: true })
  transactionId?: string;

  @Column({ nullable: true })
  payoutId?: string;

  @Column({ nullable: true })
  errorCode?: string;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ nullable: true })
  completedAt?: Date;
}
