
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  name: string;

  @Column({ type: 'jsonb' })
  value: Record<string, any>;
}
