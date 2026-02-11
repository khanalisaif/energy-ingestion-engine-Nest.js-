import { IsString, IsNumber, IsDateString, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MeterTelemetryDto {
  @IsString()
  @IsNotEmpty()
  meterId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  kwhConsumedAc: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  voltage: number;

  @IsDateString()
  timestamp: string;
}
