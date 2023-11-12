import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TelegramMessagesService } from './services';

@Module({
  imports: [HttpModule.register({})],
  providers: [TelegramMessagesService],
  exports: [TelegramMessagesService],
})
export class TelegramModule {}
