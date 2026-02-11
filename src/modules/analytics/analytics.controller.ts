import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('performance/:vehicleId')
  async getPerformance(@Param('vehicleId') vehicleId: string) {
    return this.analyticsService.getVehiclePerformance(vehicleId);
  }

  @Get('status/:vehicleId')
  async getCurrentStatus(@Param('vehicleId') vehicleId: string) {
    return this.analyticsService.getCurrentStatus(vehicleId);
  }

  @Get('fleet/summary')
  async getFleetSummary() {
    return this.analyticsService.getFleetSummary();
  }
}