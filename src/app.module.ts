import { Module } from '@nestjs/common';
import { TelegramModule } from './telegram/telegram.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    IndicatorsModule,
    TelegramModule,
  ],
})
export class AppModule {}
