import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import TelegramBot from "node-telegram-bot-api";
import { BotQuestions } from "src/schema/bot.questions";
import { BotQuestionsCategory } from "src/schema/bot.questions.categorys";
import { BotUsers, BotDocument } from "src/schema/bot.schema";
import { QuestGenerator } from "src/utils/quest-generator";

interface TestState {
  step: "in_test";
  categoryId: string;
  difficulty: "easy" | "medium" | "difficult";
  questions: BotQuestions[];
  currentIndex: number;
}

@Injectable()
export class BotService {
  private bot: TelegramBot;

  private readonly adminId: number = Number(process.env.ADMIN_ID as string);

  private adminState = new Map<number, any>();

  private questGenerator: QuestGenerator;

  constructor(
    @InjectModel(BotUsers.name) private botUserSchema: Model<BotDocument>,
    @InjectModel(BotQuestions.name) private botQuestSchema: Model<BotQuestions>,
    @InjectModel(BotQuestionsCategory.name)
    private botQuestCategorySchema: Model<BotQuestionsCategory>,
  ) {
    this.bot = new TelegramBot(process.env.BOT_TOKEN as string, {
      polling: true,
    });

    this.questGenerator = new QuestGenerator(this.botQuestSchema);

    // commands

    this.bot.setMyCommands([
      {
        command: "/start",
        description: "register for the bot",
      },
      {
        command: "/commands",
        description: "list of commands",
      },
      {
        command: "/questions",
        description: "get a question",
      },
      {
        command: "/admin",
        description: "admin panel",
      },
    ]);

    // start

    this.bot.onText(/\/start/, async (msg) => {
      const chatId: number = Number(msg.from?.id as number);

      if (chatId === this.adminId) {
        this.bot.sendMessage(chatId, "you are a admin");
      }

      const foundedUser = await this.botUserSchema.findOne({ chatId });

      if (!foundedUser) {
        await this.botUserSchema.create({
          username: msg.from?.first_name || (msg.from?.last_name as string),
          chatId,
        });

        this.bot.sendMessage(chatId, "you can use the bot");

        return this.bot.sendMessage(
          this.adminId,
          ("new user registered: " +
            (msg.from?.first_name || msg.from?.last_name)) as string,
        );
      }

      return this.bot.sendMessage(chatId, "you are already registered");
    });

    // admin panel

    this.bot.onText(/\/admin/, async (msg) => {
      if (msg.from?.id !== this.adminId) return;

      this.bot.sendMessage(msg.chat.id, "Admin panel", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "➕ Add Question", callback_data: "add_question" }],
            [{ text: "📋 List Questions", callback_data: "list_questions" }],
          ],
        },
      });
    });

    //  questions

    this.bot.onText(/\/questions/, async (msg) => {
      const chatId = Number(msg.from?.id);

      const categories = await this.botQuestCategorySchema.find();

      if (!categories.length) {
        return this.bot.sendMessage(chatId, "categories not found");
      }

      const buttons = categories.map((cat) => [
        { text: cat.name, callback_data: `cat_select_${cat._id}` },
      ]);

      this.bot.sendMessage(chatId, "select category", {
        reply_markup: { inline_keyboard: buttons },
      });
    });

    this.bot.on("callback_query", async (query) => {
      const chatId: number = Number(query.message?.chat.id as number);
      const state = this.adminState.get(chatId!);

      // add question

      if (query.data === "add_question") {
        const categories = await this.botQuestCategorySchema.find();

        if (!categories.length) {
          return this.bot.sendMessage(chatId, "No categories found ❌");
        }

        const buttons = categories.map((category) => [
          {
            text: category.name,
            callback_data: `category_${category._id}`,
          },
        ]);

        this.bot.sendMessage(chatId, "Select category for the question:", {
          reply_markup: {
            inline_keyboard: buttons,
          },
        });

        this.adminState.set(chatId, { step: "waiting_category" });
        return;
      }

      // category selected

      if (
        query.data?.startsWith("category_") &&
        state?.step === "waiting_category"
      ) {
        const categoryId = query.data.split("_")[1];

        this.adminState.set(chatId, { step: "waiting_question", categoryId });

        this.bot.sendMessage(chatId!, "please send question");
        return;
      }

      // delete question

      if (query.data?.startsWith("delete_")) {
        const id = query.data.split("_")[1];

        await this.bot.sendMessage(chatId!, "Are you sure?", {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Yes", callback_data: `confirm_${id}` },
                { text: "❌ No", callback_data: "cancel" },
              ],
            ],
          },
        });
        return;
      }

      // confirm delete

      if (query.data?.startsWith("confirm_")) {
        const id = query.data.split("_")[1];
        await this.botQuestSchema.findByIdAndDelete(id);
        this.bot.sendMessage(chatId!, "Question deleted ✅");
        return;
      }

      // cancel

      if (query.data === "cancel") {
        this.adminState.delete(chatId!);
        this.bot.sendMessage(chatId!, "Action cancelled ❌");
        return;
      }

      // list questions

      if (query.data?.startsWith("cat_select_")) {
        const catId = query.data.split("_")[2];
        const allQuestions = await this.botQuestSchema.find({
          category: catId,
        });
        const categories = await this.botQuestCategorySchema.find();

        if (!allQuestions.length) {
          return this.bot.sendMessage(
            chatId,
            "No questions found for this category ❌",
          );
        }

        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        const questions = shuffled.slice(0, Math.min(10, shuffled.length));

        await this.botUserSchema.updateOne(
          { chatId },
          {
            $set: {
              sessionCorrect: 0,
              sessionCount: 0,
            },
          },
        );

        const difficulty: "easy" | "medium" | "difficult" =
          categories[0]._id.toString() === catId
            ? "easy"
            : categories[1]._id.toString() === catId
              ? "medium"
              : "difficult";

        this.adminState.set(chatId, {
          step: "in_test",
          categoryId: catId,
          difficulty,
          questions,
          currentIndex: 0,
        } as TestState);

        this.bot.sendMessage(chatId, `Question 1: ${questions[0].quest}`);
      }

      ///
    });

    //  message

    this.bot.on("message", async (msg) => {
      const chatId: number = Number(msg.from?.id as number);

      const foundedUser = await this.botUserSchema.findOne({ chatId });

      if (!foundedUser) {
        this.bot.sendMessage(
          chatId,
          "you need to register first, please use /start command",
        );

        return;
      }

      const state = this.adminState.get(chatId);

      if (state?.step === "waiting_question") {
        this.adminState.set(chatId, {
          step: "waiting_answer",
          categoryId: state.categoryId,
          questionText: msg.text,
        });

        this.bot.sendMessage(chatId, "Send answer for the question:");
        return;
      }

      if (state?.step === "waiting_answer") {
        await this.botQuestSchema.create({
          quest: state.questionText,
          answer: msg.text,
          category: state.categoryId,
        });

        this.adminState.delete(chatId);
        this.bot.sendMessage(chatId, "Question added ✅");
        return;
      }

      //  test

      if (state && state.step === "in_test") {
        const currentQuestion = state.questions[state.currentIndex];

        const userAnswer = msg.text?.trim().toLowerCase();
        const correctAnswer = currentQuestion.answer.trim().toLowerCase();

        let replyText = "";

        if (userAnswer === correctAnswer) {
          let xpToAdd = 0;
          if (state.difficulty === "easy") xpToAdd = 10;
          else if (state.difficulty === "medium") xpToAdd = 20;
          else if (state.difficulty === "difficult") xpToAdd = 30;

          await this.botUserSchema.updateOne(
            { chatId },
            { $inc: { sessionCorrect: 1, xp: xpToAdd } },
          );

          replyText = `correct ✅ (+${xpToAdd} XP)`;
        } else {
          replyText = `wrong ❌\n answer: ${currentQuestion.answer}`;
        }

        await this.botUserSchema.updateOne(
          { chatId },
          {
            $inc: {
              sessionCount: 1,
            },
          },
        );

        state.currentIndex++;

        // конец теста
        if (state.currentIndex >= state.questions.length) {
          const user = await this.botUserSchema.findOne({ chatId });

          this.adminState.delete(chatId);

          return this.bot.sendMessage(
            chatId,
            `${replyText}\n test finished ✅corrected: ${user?.sessionCorrect || 0}
            count of questions: ${user?.sessionCount || 0}`,
          );
        }

        const nextQuestion = state.questions[state.currentIndex];

        this.adminState.set(chatId, state);

        return this.bot.sendMessage(
          chatId,
          `${replyText}\n next question:\n${nextQuestion.quest}`,
        );
      }

      // start test

      if (msg.text === "🧮 start test") {
        const categories = await this.botQuestCategorySchema.find();

        if (!categories.length) {
          return this.bot.sendMessage(chatId, "categories not found");
        }

        const buttons = categories.map((cat) => [
          { text: cat.name, callback_data: `cat_select_${cat._id}` },
        ]);

        // quest generator

        // const categoryEasyId = categories[0]._id.toString();
        // const categoryMediumId = categories[1]._id.toString();
        // const categoryDifficultId = categories[2]._id.toString();

        // await this.questGenerator.generateEasy(categoryEasyId);
        // await this.questGenerator.generateMedium(categoryMediumId);
        // await this.questGenerator.generateDifficult(categoryDifficultId);

        ///

        return this.bot.sendMessage(chatId, "select category", {
          reply_markup: { inline_keyboard: buttons },
        });
      }

      // profile

      if (msg.text === "👤 profile") {
        const foundedUser = await this.botUserSchema.findOne({ chatId });

        if (!foundedUser) return this.bot.sendMessage(chatId, "user not found");

        return this.bot.sendMessage(
          chatId,
          `👤 profile
          XP: ${foundedUser.xp}
          Correct: ${foundedUser.sessionCorrect}
          Count: ${foundedUser.sessionCount}`,
        );
      }

      // raiting

      if (msg.text === "🏆 raiting") {
        const topUsers = await this.botUserSchema
          .find()
          .sort({ xp: -1 })
          .limit(10);

        let message = "🏆 TOP 10:\n\n";

        topUsers.forEach((user, idx) => {
          message += `${idx + 1}. ${user.username} — ${user.xp} XP\n`;
        });

        return this.bot.sendMessage(chatId, message);
      }

      // ----------
    });

    /// commands

    this.bot.onText(/\/commands/, async (msg) => {
      const chatId = Number(msg.from?.id);

      return this.bot.sendMessage(chatId, "select command:", {
        reply_markup: {
          keyboard: [
            [{ text: "🧮 start test" }],
            [{ text: "👤 profile" }, { text: "🏆 raiting" }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    });

    /// -------
  }
}

("cat_select_");
("list_questions");
