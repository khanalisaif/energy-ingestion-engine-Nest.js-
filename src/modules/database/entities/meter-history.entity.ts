import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('meter_history')
@Index(['meterId', 'timestamp'])
export class MeterHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'meter_id', type: 'varchar', length: 100 })
  meterId: string;

  @Column({ name: 'kwh_consumed_ac', type: 'decimal', precision: 10, scale: 4 })
  kwhConsumedAc: number;

  @Column({ name: 'voltage', type: 'decimal', precision: 10, scale: 2 })
  voltage: number;

  @Column({ name: 'timestamp', type: 'timestamp with time zone' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
