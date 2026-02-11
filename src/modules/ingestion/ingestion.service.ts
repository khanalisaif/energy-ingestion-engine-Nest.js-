import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeterCurrent } from '../database/entities/meter-current.entity';
import { MeterHistory } from '../database/entities/meter-history.entity';
import { VehicleCurrent } from '../database/entities/vehicle-current.entity';
import { VehicleHistory } from '../database/entities/vehicle-history.entity';
import { MeterTelemetryDto } from './dto/meter-telemetry.dto';
import { VehicleTelemetryDto } from './dto/vehicle-telemetry.dto';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectRepository(MeterCurrent)
    private meterCurrentRepo: Repository<MeterCurrent>,
    
    @InjectRepository(MeterHistory)
    private meterHistoryRepo: Repository<MeterHistory>,
    
    @InjectRepository(VehicleCurrent)
    private vehicleCurrentRepo: Repository<VehicleCurrent>,
    
    @InjectRepository(VehicleHistory)
    private vehicleHistoryRepo: Repository<VehicleHistory>,
  ) {}

  /**
   * Ingest meter telemetry using dual-path strategy:
   * 1. UPSERT to meter_current (Hot Store) - Latest state
   * 2. INSERT to meter_history (Cold Store) - Audit trail
   */
  async ingestMeterTelemetry(dto: MeterTelemetryDto): Promise<{ success: boolean; message: string }> {
    try {
      const timestamp = new Date(dto.timestamp);

      // Path 1: UPSERT to Hot Store (Current Status)
      await this.meterCurrentRepo
        .createQueryBuilder()
        .insert()
        .into(MeterCurrent)
        .values({
          meterId: dto.meterId,
          kwhConsumedAc: dto.kwhConsumedAc,
          voltage: dto.voltage,
          lastUpdated: timestamp,
        })
        .orUpdate(['kwh_consumed_ac', 'voltage', 'last_updated'], ['meter_id'])
        .execute();

      // Path 2: INSERT to Cold Store (Historical Data)
      await this.meterHistoryRepo.insert({
        meterId: dto.meterId,
        kwhConsumedAc: dto.kwhConsumedAc,
        voltage: dto.voltage,
        timestamp: timestamp,
      });

      this.logger.log(`Meter telemetry ingested: ${dto.meterId}`);
      
      return {
        success: true,
        message: `Meter telemetry processed for ${dto.meterId}`,
      };
    } catch (error) {
      this.logger.error(`Failed to ingest meter telemetry: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ingest vehicle telemetry using dual-path strategy:
   * 1. UPSERT to vehicle_current (Hot Store) - Latest state
   * 2. INSERT to vehicle_history (Cold Store) - Audit trail
   */
  async ingestVehicleTelemetry(dto: VehicleTelemetryDto): Promise<{ success: boolean; message: string }> {
    try {
      const timestamp = new Date(dto.timestamp);

      // Path 1: UPSERT to Hot Store (Current Status)
      await this.vehicleCurrentRepo
        .createQueryBuilder()
        .insert()
        .into(VehicleCurrent)
        .values({
          vehicleId: dto.vehicleId,
          soc: dto.soc,
          kwhDeliveredDc: dto.kwhDeliveredDc,
          batteryTemp: dto.batteryTemp,
          lastUpdated: timestamp,
        })
        .orUpdate(['soc', 'kwh_delivered_dc', 'battery_temp', 'last_updated'], ['vehicle_id'])
        .execute();

      // Path 2: INSERT to Cold Store (Historical Data)
      await this.vehicleHistoryRepo.insert({
        vehicleId: dto.vehicleId,
        soc: dto.soc,
        kwhDeliveredDc: dto.kwhDeliveredDc,
        batteryTemp: dto.batteryTemp,
        timestamp: timestamp,
      });

      this.logger.log(`Vehicle telemetry ingested: ${dto.vehicleId}`);
      
      return {
        success: true,
        message: `Vehicle telemetry processed for ${dto.vehicleId}`,
      };
    } catch (error) {
      this.logger.error(`Failed to ingest vehicle telemetry: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk ingestion for high-throughput scenarios
   */
  async bulkIngestMeter(telemetryBatch: MeterTelemetryDto[]): Promise<{ success: boolean; count: number }> {
    try {
      const results = await Promise.all(
        telemetryBatch.map(dto => this.ingestMeterTelemetry(dto))
      );
      
      return {
        success: true,
        count: results.length,
      };
    } catch (error) {
      this.logger.error(`Bulk meter ingestion failed: ${error.message}`);
      throw error;
    }
  }

  async bulkIngestVehicle(telemetryBatch: VehicleTelemetryDto[]): Promise<{ success: boolean; count: number }> {
    try {
      const results = await Promise.all(
        telemetryBatch.map(dto => this.ingestVehicleTelemetry(dto))
      );
      
      return {
        success: true,
        count: results.length,
      };
    } catch (error) {
      this.logger.error(`Bulk vehicle ingestion failed: ${error.message}`);
      throw error;
    }
  }
}
