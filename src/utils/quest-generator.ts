import { Model } from "mongoose";
import { BotQuestions } from "src/schema/bot.questions";

type QuestionCreate = {
  quest: string;
  answer: string;
  category: string;
};

export class QuestGenerator {
  constructor(private readonly botQuestSchema: Model<BotQuestions>) {}

  private random(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async generateEasy(categoryId: string) {
    const questions: QuestionCreate[] = [];

    for (let i = 0; i < 10; i++) {
      const a = this.random(1, 100);
      const b = this.random(1, 100);
      const op = Math.random() > 0.5 ? "+" : "-";

      const quest = `${a} ${op} ${b}`;
      const answer = op === "+" ? a + b : a - b;

      questions.push({
        quest,
        answer: String(answer),
        category: categoryId,
      });
    }

    await this.botQuestSchema.insertMany(questions);
  }

  async generateMedium(categoryId: string) {
    const questions: QuestionCreate[] = [];

    for (let i = 0; i < 10; i++) {
      const isMultiply = Math.random() > 0.5;

      let a: number;
      let b: number;
      let quest: string;
      let answer: number;

      if (isMultiply) {
        a = this.random(2, 20);
        b = this.random(2, 20);

        quest = `${a} * ${b}`;
        answer = a * b;
      } else {
        b = this.random(2, 20);
        answer = this.random(2, 20);
        a = b * answer;

        quest = `${a} / ${b}`;
      }

      questions.push({
        quest,
        answer: String(answer),
        category: categoryId,
      });
    }

    await this.botQuestSchema.insertMany(questions);
  }

  async generateDifficult(categoryId: string) {
    const questions: QuestionCreate[] = [];

    for (let i = 0; i < 10; i++) {
      const a = this.random(2, 10);
      const b = this.random(2, 10);

      const d = this.random(2, 10);
      const divResult = this.random(1, 10);
      const c = d * divResult;

      const e = this.random(1, 10);

      const quest = `${a} * ${b} - ${c} / ${d} - ${e}`;
      const answer = a * b - c / d - e;

      questions.push({
        quest,
        answer: String(answer),
        category: categoryId,
      });
    }

    await this.botQuestSchema.insertMany(questions);
  }
}
