import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('vehicle_current')
export class VehicleCurrent {
  @PrimaryColumn({ name: 'vehicle_id', type: 'varchar', length: 100 })
  vehicleId: string;

  @Column({ name: 'soc', type: 'decimal', precision: 5, scale: 2 })
  soc: number;

  @Column({ name: 'kwh_delivered_dc', type: 'decimal', precision: 10, scale: 4 })
  kwhDeliveredDc: number;

  @Column({ name: 'battery_temp', type: 'decimal', precision: 5, scale: 2 })
  batteryTemp: number;

  @UpdateDateColumn({ name: 'last_updated', type: 'timestamp with time zone' })
  lastUpdated: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
