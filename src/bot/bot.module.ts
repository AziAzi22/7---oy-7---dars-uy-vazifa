import { Module } from "@nestjs/common";
import { BotService } from "./bot.service";
import { MongooseModule } from "@nestjs/mongoose";
import { BotUsers, BotUsersSchema } from "src/schema/bot.schema";
import { BotQuestions, BotQuestionsSchema } from "src/schema/bot.questions";
import { BotQuestionsCategory, BotQuestionsCategorySchema } from "src/schema/bot.questions.categorys";


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BotUsers.name, schema: BotUsersSchema },
      { name: BotQuestions.name, schema: BotQuestionsSchema },
      { name: BotQuestionsCategory.name, schema: BotQuestionsCategorySchema },
    ]),
  ],
  providers: [BotService],
})

export class BotModule {}