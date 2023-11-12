import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Binance as BinanceInterface,
  CandleChartInterval,
  CandleChartResult,
} from 'binance-api-node';
import { BinanceClientService } from './binance-client.service';
import { TelegramMessagesService } from '../../telegram/services';

@Injectable()
export class MaIchimokuService implements OnModuleInit {
  private client: BinanceInterface;
  private symbol = 'BTCUSDT';
  private interval = '1h' as CandleChartInterval; // 1-hour candlesticks
  private shortPeriod = 9; // Short-term moving average period
  private longPeriod = 26; // Long-term moving average period
  private cloudConversionPeriod = 9; // Ichimoku cloud conversion line period
  private cloudBasePeriod = 26; // Ichimoku cloud base line period
  private cloudSpanPeriod = 52; // Ichimoku cloud span B period
  private cloudDisplacement = 26; // Ichimoku cloud displacement

  constructor(
    private readonly binanceClientService: BinanceClientService,
    private readonly telegramMessagesService: TelegramMessagesService,
  ) {
    this.client = this.binanceClientService.client;
  }

  async onModuleInit() {
    console.log('Ma & ichimolu cloud running! ', await this.client.ping());
    setInterval(() => this.executeTradingStrategy(), 5 * 60 * 1000); // Run every 15 minutes 15 * 60 * 1000
  }

  // Function to calculate Moving Averages (MA)
  calculateMovingAverages(
    closes: number[],
    shortPeriod: number,
    longPeriod: number,
  ) {
    const shortMA = this.calculateSimpleMovingAverage(closes, shortPeriod);
    const longMA = this.calculateSimpleMovingAverage(closes, longPeriod);

    return { shortMA, longMA };
  }

  // Function to calculate Ichimoku Cloud
  calculateIchimokuCloud(
    candles: CandleChartResult[],
    conversionPeriod: number,
    basePeriod: number,
    spanPeriod: number,
    displacement: number,
  ) {
    const conversionLine = this.calculateConversionLine(
      candles,
      conversionPeriod,
    );
    const baseLine = this.calculateBaseLine(candles, basePeriod);
    const spanA = this.calculateSpanA(conversionLine, baseLine);
    const spanB = this.calculateSpanB(candles, spanPeriod, displacement);

    return { conversionLine, baseLine, spanA, spanB };
  }

  // Function to calculate Simple Moving Average (SMA)
  calculateSimpleMovingAverage(values: number[], period: number): number {
    return (
      values.slice(0, period).reduce((sum, value) => sum + value, 0) / period
    );
  }

  // Function to calculate Conversion Line for Ichimoku Cloud
  calculateConversionLine(
    candles: CandleChartResult[],
    period: number,
  ): number[] {
    return candles.slice(0, period).map((candle) => parseFloat(candle.close));
  }

  // Function to calculate Base Line for Ichimoku Cloud
  calculateBaseLine(candles: CandleChartResult[], period: number): number[] {
    return candles.slice(0, period).map((candle) => parseFloat(candle.close));
  }

  // Function to calculate Span A for Ichimoku Cloud
  calculateSpanA(conversionLine: number[], baseLine: number[]): number[] {
    return conversionLine.map((_, i) => (conversionLine[i] + baseLine[i]) / 2);
  }

  // Function to calculate Span B for Ichimoku Cloud
  calculateSpanB(
    candles: CandleChartResult[],
    period: number,
    displacement: number,
  ): number[] {
    return candles
      .slice(0, period + displacement)
      .map((candle) => parseFloat(candle.close));
  }

  // Main trading logic
  async executeTradingStrategy() {
    try {
      const candles: CandleChartResult[] = await this.client.candles({
        symbol: this.symbol,
        interval: this.interval,
      });

      // Extract close prices from the candlestick data
      const closes: number[] = candles.map((candle) =>
        parseFloat(candle.close),
      );

      // Calculate Moving Averages
      const { shortMA, longMA } = this.calculateMovingAverages(
        closes,
        this.shortPeriod,
        this.longPeriod,
      );

      // Calculate Ichimoku Cloud
      const { conversionLine, baseLine, spanA, spanB } =
        this.calculateIchimokuCloud(
          candles,
          this.cloudConversionPeriod,
          this.cloudBasePeriod,
          this.cloudSpanPeriod,
          this.cloudDisplacement,
        );

      console.log(
        `Short MA: ${shortMA.toFixed(4)}, Long MA: ${longMA.toFixed(4)}`,
      );
      console.log(
        `Conversion Line: ${conversionLine[0].toFixed(
          4,
        )}, Base Line: ${baseLine[0].toFixed(4)}`,
      );
      console.log(
        `Span A: ${spanA[0].toFixed(4)}, Span B: ${spanB[0].toFixed(4)}`,
      );

      // Implement your trading strategy based on Moving Averages and Ichimoku Cloud
      if (shortMA > longMA && spanA[0] > spanB[0]) {
        // Buy signal
        console.log('Ma & ichi: Buy Signal!');
        await this.telegramMessagesService.send('Ma & ichi: Buy Signal!');
      } else if (shortMA < longMA && spanA[0] < spanB[0]) {
        // Sell signal
        console.log('Ma & ichi: Sell Signal!');
        await this.telegramMessagesService.send('Ma & ichi: Sell Signal!');
      } else {
        console.log('Ma & ichi: No Trading Signal');
        await this.telegramMessagesService.send(
          'Ma & ichi: No Trading Signal!',
        );
      }
    } catch (error) {
      console.error(
        'Ma & ichi: Error executing trading strategy:',
        error.message,
      );
      await this.telegramMessagesService.send(
        `'Ma & ichi: Error executing trading strategy: ${error.message}`,
      );
    }
  }
}
