import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type BotDocument = BotQuestionsCategory & Document;

@Schema({ timestamps: true, versionKey: false })
export class BotQuestionsCategory {
  @Prop({ required: true })
  name: string;
}

export const BotQuestionsCategorySchema = SchemaFactory.createForClass(BotQuestionsCategory);
