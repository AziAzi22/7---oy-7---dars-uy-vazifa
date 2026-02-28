import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export type BotDocument = BotQuestions & Document;

@Schema({ timestamps: true, versionKey: false })
export class BotQuestions {
  @Prop({ required: true })
  quest: string;

  @Prop({ required: true })
  answer: string;

  @Prop({ required: true, type: Types.ObjectId, ref: "BotQuestionsCategory" })
  category: Types.ObjectId;
}

export const BotQuestionsSchema = SchemaFactory.createForClass(BotQuestions);
