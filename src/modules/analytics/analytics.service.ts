import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeterHistory } from '../database/entities/meter-history.entity';
import { VehicleHistory } from '../database/entities/vehicle-history.entity';

export interface PerformanceAnalytics {
  vehicleId: string;
  period: string;
  totalEnergyConsumedAc: number;
  totalEnergyDeliveredDc: number;
  efficiencyRatio: number;
  efficiencyPercentage: number;
  averageBatteryTemp: number;
  dataPoints: number;
  warnings: string[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly EFFICIENCY_THRESHOLD = 0.85; // 85% minimum efficiency

  constructor(
    @InjectRepository(MeterHistory)
    private meterHistoryRepo: Repository<MeterHistory>,
    
    @InjectRepository(VehicleHistory)
    private vehicleHistoryRepo: Repository<VehicleHistory>,
  ) {}

  /**
   * Get 24-hour performance analytics for a vehicle
   * Uses indexed queries to avoid full table scans
   */
  async getVehiclePerformance(vehicleId: string): Promise<PerformanceAnalytics> {
    try {
      // Calculate time range (last 24 hours)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      this.logger.log(`Fetching analytics for vehicle ${vehicleId} from ${startTime} to ${endTime}`);

      // Query 1: Aggregate vehicle data (DC delivered)
      // Uses index: idx_vehicle_history_vehicle_id_timestamp
      const vehicleData = await this.vehicleHistoryRepo
        .createQueryBuilder('vh')
        .select('SUM(vh.kwh_delivered_dc)', 'totalDc')
        .addSelect('AVG(vh.battery_temp)', 'avgTemp')
        .addSelect('COUNT(*)', 'count')
        .where('vh.vehicle_id = :vehicleId', { vehicleId })
        .andWhere('vh.timestamp >= :startTime', { startTime })
        .andWhere('vh.timestamp <= :endTime', { endTime })
        .getRawOne();

      if (!vehicleData || vehicleData.count === '0') {
        throw new NotFoundException(`No data found for vehicle ${vehicleId} in the last 24 hours`);
      }

      // Query 2: Aggregate meter data (AC consumed)
      // Assuming correlation: meter_id matches vehicle_id (or via mapping table)
      // Uses index: idx_meter_history_meter_id_timestamp
      const meterData = await this.meterHistoryRepo
        .createQueryBuilder('mh')
        .select('SUM(mh.kwh_consumed_ac)', 'totalAc')
        .where('mh.meter_id = :meterId', { meterId: vehicleId })
        .andWhere('mh.timestamp >= :startTime', { startTime })
        .andWhere('mh.timestamp <= :endTime', { endTime })
        .getRawOne();

      const totalAc = parseFloat(meterData?.totalAc || '0');
      const totalDc = parseFloat(vehicleData.totalDc || '0');
      const avgTemp = parseFloat(vehicleData.avgTemp || '0');
      const dataPoints = parseInt(vehicleData.count || '0');

      // Calculate efficiency
      const efficiencyRatio = totalAc > 0 ? totalDc / totalAc : 0;
      const efficiencyPercentage = efficiencyRatio * 100;

      // Generate warnings
      const warnings: string[] = [];
      
      if (efficiencyRatio < this.EFFICIENCY_THRESHOLD) {
        warnings.push(
          `Low efficiency detected: ${efficiencyPercentage.toFixed(2)}% (below ${this.EFFICIENCY_THRESHOLD * 100}% threshold). ` +
          'Possible hardware fault or energy leakage.'
        );
      }

      if (avgTemp > 45) {
        warnings.push(`High battery temperature: ${avgTemp.toFixed(2)}°C. Monitor for thermal issues.`);
      } else if (avgTemp < 0) {
        warnings.push(`Low battery temperature: ${avgTemp.toFixed(2)}°C. Cold weather may affect performance.`);
      }

      if (totalAc < totalDc) {
        warnings.push(
          'Anomaly: DC delivered exceeds AC consumed. Check meter-vehicle correlation or data integrity.'
        );
      }

      const analytics: PerformanceAnalytics = {
        vehicleId,
        period: '24 hours',
        totalEnergyConsumedAc: parseFloat(totalAc.toFixed(4)),
        totalEnergyDeliveredDc: parseFloat(totalDc.toFixed(4)),
        efficiencyRatio: parseFloat(efficiencyRatio.toFixed(4)),
        efficiencyPercentage: parseFloat(efficiencyPercentage.toFixed(2)),
        averageBatteryTemp: parseFloat(avgTemp.toFixed(2)),
        dataPoints,
        warnings,
      };

      this.logger.log(`Analytics generated for ${vehicleId}: ${efficiencyPercentage.toFixed(2)}% efficiency`);

      return analytics;
    } catch (error) {
      this.logger.error(`Failed to generate analytics for ${vehicleId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current status of a vehicle (from hot store)
   */
  async getCurrentStatus(vehicleId: string) {
    const vehicleData = await this.vehicleHistoryRepo
      .createQueryBuilder('vh')
      .where('vh.vehicle_id = :vehicleId', { vehicleId })
      .orderBy('vh.timestamp', 'DESC')
      .limit(1)
      .getOne();

    if (!vehicleData) {
      throw new NotFoundException(`No data found for vehicle ${vehicleId}`);
    }

    return vehicleData;
  }

  /**
   * Get fleet-wide analytics summary
   */
  async getFleetSummary() {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const [totalVehicles, totalMeters, avgEfficiency] = await Promise.all([
      this.vehicleHistoryRepo
        .createQueryBuilder('vh')
        .select('COUNT(DISTINCT vh.vehicle_id)', 'count')
        .where('vh.timestamp >= :startTime', { startTime })
        .getRawOne(),

      this.meterHistoryRepo
        .createQueryBuilder('mh')
        .select('COUNT(DISTINCT mh.meter_id)', 'count')
        .where('mh.timestamp >= :startTime', { startTime })
        .getRawOne(),

      this.calculateFleetEfficiency(startTime, endTime),
    ]);

    return {
      activeVehicles: parseInt(totalVehicles.count || '0'),
      activeMeters: parseInt(totalMeters.count || '0'),
      averageFleetEfficiency: avgEfficiency,
      period: '24 hours',
      timestamp: new Date(),
    };
  }

  private async calculateFleetEfficiency(startTime: Date, endTime: Date): Promise<number> {
    const [acTotal, dcTotal] = await Promise.all([
      this.meterHistoryRepo
        .createQueryBuilder('mh')
        .select('SUM(mh.kwh_consumed_ac)', 'total')
        .where('mh.timestamp >= :startTime', { startTime })
        .andWhere('mh.timestamp <= :endTime', { endTime })
        .getRawOne(),

      this.vehicleHistoryRepo
        .createQueryBuilder('vh')
        .select('SUM(vh.kwh_delivered_dc)', 'total')
        .where('vh.timestamp >= :startTime', { startTime })
        .andWhere('vh.timestamp <= :endTime', { endTime })
        .getRawOne(),
    ]);

    const totalAc = parseFloat(acTotal?.total || '0');
    const totalDc = parseFloat(dcTotal?.total || '0');

    return totalAc > 0 ? parseFloat(((totalDc / totalAc) * 100).toFixed(2)) : 0;
  }
}
