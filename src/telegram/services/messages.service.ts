import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class TelegramMessagesService {
  private url: string;
  constructor(private readonly httpService: HttpService) {
    this.url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_ID}/sendMessage?chat_id=${process.env.TELEGRAM_CHANNEL_ID}`;
  }

  async send(message: string) {
    try {
      await lastValueFrom(
        this.httpService.get(this.url, {
          params: {
            text: message,
          },
        }),
      );
    } catch (err) {
      console.log('TelegramMessagesService [send]: ', err);
    }
  }
}
