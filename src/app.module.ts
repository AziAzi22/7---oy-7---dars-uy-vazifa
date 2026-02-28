import { Module } from '@nestjs/common';
import { BotModule } from './bot/bot.module';
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ".env", isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URL as string),
    BotModule
  ],
  controllers: [],
  providers: [],
})

export class AppModule {}
