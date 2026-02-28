import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export type BotDocument = BotUsers & Document;

@Schema({ timestamps: true, versionKey: false })
export class BotUsers {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true, unique: true })
  chatId: number;

  @Prop({ default: 0 })
  xp: number; 
  @Prop({ default: 0 })
  sessionCorrect: number;

  @Prop({ default: 0 })
  sessionCount: number;

  @Prop({ type: Types.ObjectId, ref: "BotQuestions" })
  currentQuestion: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BotQuestionsCategory" })
  currentCategory: Types.ObjectId;
}

export const BotUsersSchema = SchemaFactory.createForClass(BotUsers);