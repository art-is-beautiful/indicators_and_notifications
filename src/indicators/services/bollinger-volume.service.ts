import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Binance as BinanceInterface,
  CandleChartInterval_LT,
} from 'binance-api-node';
import { BinanceClientService } from './binance-client.service';
import { TelegramMessagesService } from '../../telegram/services';

@Injectable()
export class BollingerVolumeService implements OnModuleInit {
  private client: BinanceInterface;
  private symbol = 'BTCUSDT';
  private interval = '1h' as CandleChartInterval_LT; // 1-hour candlesticks

  constructor(
    private readonly binanceClientService: BinanceClientService,
    private readonly telegramMessagesService: TelegramMessagesService,
  ) {
    this.client = this.binanceClientService.client;
  }

  async onModuleInit() {
    console.log('Bollinger & volume running! ', await this.client.ping());
    setInterval(() => this.executeTradingStrategy(), 1 * 60 * 1000); // Run every 15 minutes 15 * 60 * 1000
  }

  // Function to get Bollinger Bands
  async getBollingerBands(
    symbol: string,
    interval: CandleChartInterval_LT,
    period: number,
    deviation: number,
  ) {
    const candles = await this.client.candles({
      symbol,
      interval,
      limit: period + 1,
    });
    const closes = candles.map((candle) => parseFloat(candle.close));

    const sma =
      closes.slice(0, period).reduce((sum, close) => sum + close, 0) / period;
    const stdDev = Math.sqrt(
      closes.reduce((sum, close) => sum + Math.pow(close - sma, 2), 0) / period,
    );

    const upperBand = sma + deviation * stdDev;
    const lowerBand = sma - deviation * stdDev;

    return { upperBand, lowerBand };
  }

  // Function to get Volume Profile
  async getVolumeProfile(symbol: string, interval: CandleChartInterval_LT) {
    const candles = await this.client.candles({ symbol, interval });
    const volumes = candles.map((candle) => parseFloat(candle.volume));

    const maxVolume = Math.max(...volumes);
    const maxVolumeIndex = volumes.indexOf(maxVolume);
    const maxVolumePrice = parseFloat(candles[maxVolumeIndex].close);

    return { maxVolume, maxVolumePrice };
  }

  // Main trading logic
  async executeTradingStrategy() {
    try {
      const { upperBand, lowerBand } = await this.getBollingerBands(
        this.symbol,
        this.interval,
        20,
        2,
      );
      // console.log('upperBand: ', upperBand);
      // console.log('lowerBand: ', lowerBand);
      const { maxVolume, maxVolumePrice } = await this.getVolumeProfile(
        this.symbol,
        this.interval,
      );
      // console.log('maxVolume: ', maxVolume);
      // console.log('maxVolumePrice: ', maxVolumePrice);

      const tickerArray = await this.client.dailyStats({ symbol: this.symbol });
      const ticker = Array.isArray(tickerArray) ? tickerArray[0] : tickerArray;
      // console.log('ticker: ', ticker);

      if (
        parseFloat(ticker.askPrice) > upperBand &&
        parseFloat(ticker.askPrice) > maxVolumePrice
      ) {
        // Implement your buying logic here
        console.log('Bollinger & volume: Buy Signal!');
        await this.telegramMessagesService.send(
          'Bollinger & volume: Buy Signal!',
        );
      } else if (parseFloat(ticker.bidPrice) < lowerBand) {
        // Implement your selling logic here
        console.log('Bollinger & volume: Sell Signal!');
        await this.telegramMessagesService.send(
          'Bollinger & volume: Sell Signal!',
        );
      } else {
        console.log('Bollinger & volume: No Trading Signal');
        await this.telegramMessagesService.send(
          'Bollinger & volume: No Trading Signal',
        );
      }
    } catch (error) {
      console.error(
        'Bollinger & volume: Error executing trading strategy:',
        error.message,
      );
      await this.telegramMessagesService.send(
        `'Bollinger & volume: Error executing trading strategy: ${error.message}`,
      );
    }
  }
}
