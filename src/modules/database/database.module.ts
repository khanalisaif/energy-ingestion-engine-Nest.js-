import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeterCurrent } from './entities/meter-current.entity';
import { MeterHistory } from './entities/meter-history.entity';
import { VehicleCurrent } from './entities/vehicle-current.entity';
import { VehicleHistory } from './entities/vehicle-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MeterCurrent,
      MeterHistory,
      VehicleCurrent,
      VehicleHistory,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
