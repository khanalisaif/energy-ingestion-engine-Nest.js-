import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { MeterTelemetryDto } from './dto/meter-telemetry.dto';
import { VehicleTelemetryDto } from './dto/vehicle-telemetry.dto';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('meter')
  @HttpCode(HttpStatus.CREATED)
  async ingestMeter(@Body() meterTelemetry: MeterTelemetryDto) {
    return this.ingestionService.ingestMeterTelemetry(meterTelemetry);
  }

  @Post('vehicle')
  @HttpCode(HttpStatus.CREATED)
  async ingestVehicle(@Body() vehicleTelemetry: VehicleTelemetryDto) {
    return this.ingestionService.ingestVehicleTelemetry(vehicleTelemetry);
  }

  @Post('meter/bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkIngestMeter(@Body() telemetryBatch: MeterTelemetryDto[]) {
    return this.ingestionService.bulkIngestMeter(telemetryBatch);
  }

  @Post('vehicle/bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkIngestVehicle(@Body() telemetryBatch: VehicleTelemetryDto[]) {
    return this.ingestionService.bulkIngestVehicle(telemetryBatch);
  }
}
