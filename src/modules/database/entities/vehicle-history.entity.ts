import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('vehicle_history')
@Index(['vehicleId', 'timestamp'])
export class VehicleHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'vehicle_id', type: 'varchar', length: 100 })
  vehicleId: string;

  @Column({ name: 'soc', type: 'decimal', precision: 5, scale: 2 })
  soc: number;

  @Column({ name: 'kwh_delivered_dc', type: 'decimal', precision: 10, scale: 4 })
  kwhDeliveredDc: number;

  @Column({ name: 'battery_temp', type: 'decimal', precision: 5, scale: 2 })
  batteryTemp: number;

  @Column({ name: 'timestamp', type: 'timestamp with time zone' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
