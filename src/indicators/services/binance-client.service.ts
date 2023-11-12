import { Injectable, OnModuleInit } from '@nestjs/common';
import Binance, { Binance as BinanceInterface } from 'binance-api-node';

@Injectable()
export class BinanceClientService implements OnModuleInit {
  public client: BinanceInterface;
  constructor() {
    this.client = Binance({
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_SECRET_KEY,
    });
  }
  async onModuleInit() {
    console.log('BinanceClient init: ', await this.client.ping());
  }
}
