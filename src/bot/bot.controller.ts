import { Body, Controller, Post } from "@nestjs/common";
import { BotService } from "./bot.service";

@Controller()
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post("bot")
  async handleUpdate(@Body() body: any) {
    await this.botService.processUpdate(body);
  }
}