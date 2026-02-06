import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { NodemailerProvider } from './providers/nodemailer.provider';
import { MockEmailProvider } from './providers/mock.provider';
import { ConsoleEmailProvider } from './providers/console.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    EmailService,
    NodemailerProvider,
    MockEmailProvider,
    ConsoleEmailProvider,
  ],
  exports: [EmailService],
})
export class EmailModule {}
