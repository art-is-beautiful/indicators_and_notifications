import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Binance as BinanceInterface,
  CandleChartInterval,
  CandleChartResult,
} from 'binance-api-node';
import { BinanceClientService } from './binance-client.service';
import { TelegramMessagesService } from '../../telegram/services';

@Injectable()
export class RsiMacdService implements OnModuleInit {
  private client: BinanceInterface;
  private symbol = 'BTCUSDT';
  private interval = '1h' as CandleChartInterval; // 1-hour candlesticks
  private rsiPeriod = 14; // RSI period
  private macdShortPeriod = 12; // MACD short period
  private macdLongPeriod = 26; // MACD long period
  private macdSignalPeriod = 9; // MACD signal period

  constructor(
    private readonly binanceClient: BinanceClientService,
    private readonly telegramMessagesService: TelegramMessagesService,
  ) {
    this.client = this.binanceClient.client;
  }

  async onModuleInit() {
    console.log('Rsi & macd running! ', await this.client.ping());
    setInterval(() => this.executeTradingStrategy(), 5 * 60 * 1000); // Run every 15 minutes 15 * 60 * 1000
  }

  // Function to calculate RSI
  calculateRsi(closes: number[], period: number): number {
    const diffs = closes.slice(1).map((close, i) => close - closes[i]);
    const gains = diffs.map((diff) => (diff > 0 ? diff : 0));
    const losses = diffs.map((diff) => (diff < 0 ? Math.abs(diff) : 0));

    const avgGain =
      gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss =
      losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    const relativeStrength = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + relativeStrength);

    return rsi;
  }

  // Function to calculate MACD
  calculateMacd(
    closes: number[],
    shortPeriod: number,
    longPeriod: number,
    signalPeriod: number,
  ) {
    const shortEma = this.calculateExponentialMovingAverage(
      closes,
      shortPeriod,
    );
    const longEma = this.calculateExponentialMovingAverage(closes, longPeriod);

    const macdLine = shortEma - longEma;
    const signalLine = this.calculateExponentialMovingAverage(
      [macdLine],
      signalPeriod,
    );

    return { macdLine, signalLine, histogram: macdLine - signalLine };
  }

  // Function to calculate Exponential Moving Average (EMA)
  calculateExponentialMovingAverage(values: number[], period: number): number {
    const multiplier = 2 / (period + 1);
    let ema =
      values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
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

      // Calculate RSI
      const rsi = this.calculateRsi(closes, this.rsiPeriod);

      // Calculate MACD
      const macd = this.calculateMacd(
        closes,
        this.macdShortPeriod,
        this.macdLongPeriod,
        this.macdSignalPeriod,
      );

      console.log(
        `RSI: ${rsi.toFixed(2)}, MACD: ${macd.macdLine.toFixed(
          4,
        )}, Signal: ${macd.signalLine.toFixed(4)}`,
      );

      // Implement your trading strategy based on RSI and MACD values
      if (rsi < 30 && macd.macdLine > macd.signalLine) {
        // Buy signal
        console.log('Rsi & macd: Buy Signal!');
        await this.telegramMessagesService.send('Rsi & macd: Buy Signal!');
      } else if (rsi > 70 && macd.macdLine < macd.signalLine) {
        // Sell signal
        console.log('Rsi & macd: Sell Signal!');
        await this.telegramMessagesService.send('Rsi & macd: Sell Signal!');
      } else {
        console.log('Rsi & macd: No Trading Signal');
        await this.telegramMessagesService.send(
          'Rsi & macd: No Trading Signal!',
        );
      }
    } catch (error) {
      console.error(
        'Rsi & macd: Error executing trading strategy:',
        error.message,
      );
      await this.telegramMessagesService.send(
        `Rsi & macd: Error executing trading strategy: ${error.message}`,
      );
    }
  }
}
