import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('meter_current')
export class MeterCurrent {
  @PrimaryColumn({ name: 'meter_id', type: 'varchar', length: 100 })
  meterId: string;

  @Column({ name: 'kwh_consumed_ac', type: 'decimal', precision: 10, scale: 4 })
  kwhConsumedAc: number;

  @Column({ name: 'voltage', type: 'decimal', precision: 10, scale: 2 })
  voltage: number;

  @UpdateDateColumn({ name: 'last_updated', type: 'timestamp with time zone' })
  lastUpdated: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
