import { Module } from '@nestjs/common';
import {
  BinanceClientService,
  BollingerVolumeService,
  MaIchimokuService,
  RsiMacdService,
} from './services';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  controllers: [],
  providers: [
    BinanceClientService,
    BollingerVolumeService,
    RsiMacdService,
    MaIchimokuService,
  ],
})
export class IndicatorsModule {}
