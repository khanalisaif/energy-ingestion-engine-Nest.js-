import { IsString, IsNumber, IsDateString, IsNotEmpty, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class VehicleTelemetryDto {
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  soc: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  kwhDeliveredDc: number;

  @IsNumber()
  @Type(() => Number)
  batteryTemp: number;

  @IsDateString()
  timestamp: string;
}
