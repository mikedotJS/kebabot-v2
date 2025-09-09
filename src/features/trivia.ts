import { TextChannel, Message, Collection } from "discord.js";
import OpenAI from "openai";
import env from "../config/env.js";
import { queryCollection } from "../config/db.js";
import { incrementContribution, getUserLevel } from "./contributions.js";
const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

interface PlayerPointsDoc {
  userId: string;
  points: number;
}

async function getPlayerPoints(userId: string): Promise<number> {
  return queryCollection<number, PlayerPointsDoc>(
    "trivia_points",
    async (collection) => {
      const doc = await collection.findOne({ userId });
      return doc?.points ?? 0;
    }
  );
}

async function incrementPlayerPoints(userId: string): Promise<number> {
  return queryCollection<number, PlayerPointsDoc>(
    "trivia_points",
    async (collection) => {
      // The return type of findOneAndUpdate is not correctly inferred, so we use 'any' here
      const result: any = await collection.findOneAndUpdate(
        { userId },
        { $inc: { points: 1 } },
        { upsert: true, returnDocument: "after" }
      );
      if (result && result.value) {
        return result.value.points;
      }
      return 1;
    }
  );
}

async function getAllPlayerPoints(): Promise<
  { userId: string; points: number }[]
> {
  return queryCollection<{ userId: string; points: number }[], PlayerPointsDoc>(
    "trivia_points",
    async (collection) => {
      const docs = await collection.find().toArray();
      return docs.map(({ userId, points }) => ({ userId, points }));
    }
  );
}

interface TriviaQuestionDoc {
  question: string;
  answer: string;
}

const currentQuestion: {
  question: string;
  answer: string;
  messageId: string | null;
} = {
  question: "",
  answer: "",
  messageId: null,
};

async function hasQuestionBeenAsked(question: string): Promise<boolean> {
  return queryCollection<boolean, TriviaQuestionDoc>(
    "trivia_questions",
    async (collection) => {
      const found = await collection.findOne({ question });
      return !!found;
    }
  );
}

async function addAskedQuestion(
  question: string,
  answer: string
): Promise<void> {
  await queryCollection<void, TriviaQuestionDoc>(
    "trivia_questions",
    async (collection) => {
      await collection.insertOne({ question, answer });
    }
  );
}

// OpenAI setup

export async function fetchGamingTrivia(): Promise<{
  question: string;
  answer: string;
}> {
  // Get all previously asked questions
  const askedQuestions = await queryCollection<string[], TriviaQuestionDoc>(
    "trivia_questions",
    async (collection) => {
      const docs = await collection.find().toArray();
      return docs.map((doc) => doc.question);
    }
  );

  const messages = [
    {
      role: "developer" as const,
      content:
        "You are a trivia generator for a Discord bot. Only respond with a unique, fun, and challenging gaming-related trivia question and its answer. Format: Question: ... Answer: ...",
    },
    ...askedQuestions.map((q) => ({
      role: "developer" as const,
      content: `You asked this question already: ${q}`,
    })),
    {
      role: "user" as const,
      content: "Generate a new trivia question.",
    },
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages,
  });
  const text = response.choices[0].message.content || "";
  const match = text.match(/Question:\s*(.+)\s*Answer:\s*(.+)/is);
  if (!match) throw new Error("Failed to parse trivia question from OpenAI");
  return { question: match[1].trim(), answer: match[2].trim() };
}

export async function askDailyTrivia(channel: TextChannel): Promise<void> {
  let trivia;
  let attempts = 0;
  do {
    trivia = await fetchGamingTrivia();
    attempts++;
    if (attempts > 5) throw new Error("Couldn't get a new trivia question");
  } while (await hasQuestionBeenAsked(trivia.question));
  await addAskedQuestion(trivia.question, trivia.answer);
  currentQuestion.question = trivia.question;
  currentQuestion.answer = trivia.answer;
  const sent = await channel.send(
    `🎮 **Daily Gaming Trivia!**\n${trivia.question}\n_Reply to this message with your answer!_`
  );
  currentQuestion.messageId = sent.id;
}

// Checks answer correctness using OpenAI 4o-mini
export async function isAnswerCorrectWithOpenAI(
  question: string,
  correctAnswer: string,
  userAnswer: string
): Promise<boolean> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert trivia judge. Given a question, the correct answer, and a user's answer, reply with only 'yes' if the user's answer is correct, or 'no' if it is not. Be lenient and accept: minor typos, spelling errors, singular/plural variations, missing or extra articles (the, a, an), abbreviations, synonyms, alternative names, partial answers that capture the essence, and phonetically similar words. Focus on whether the user demonstrates knowledge of the correct answer rather than exact word matching. Do not explain your decision.",
        },
        {
          role: "user",
          content: `Question: ${question}\nCorrect Answer: ${correctAnswer}\nUser Answer: ${userAnswer}`,
        },
      ],
      max_tokens: 3,
      temperature: 0,
    });
    const result = response.choices[0].message.content?.trim().toLowerCase();
    return result === "yes";
  } catch (error) {
    console.error("[Trivia] OpenAI answer check failed:", error);
    return false;
  }
}

export async function handleTriviaAnswer(message: Message): Promise<void> {
  if (
    !currentQuestion.question ||
    !currentQuestion.messageId ||
    message.reference?.messageId !== currentQuestion.messageId
  ) {
    return;
  }
  const userAnswer = message.content.trim();
  const correctAnswer = currentQuestion.answer.trim();
  // Use OpenAI 4o-mini to check answer
  const isCorrect = await isAnswerCorrectWithOpenAI(
    currentQuestion.question,
    correctAnswer,
    userAnswer
  );
  if (isCorrect) {
    const newPoints = await incrementPlayerPoints(message.author.id);
    const levelUpResult = await incrementContribution(message.author.id, message.client);
    const userLevel = await getUserLevel(message.author.id);
    const expToNext = userLevel.nextLevelExp - userLevel.contributions;
    
    let response = `✅ Correct, ${message.author.username}! You now have ${newPoints} trivia point(s) and are level ${userLevel.level} (${expToNext} XP to next level).`;
    
    if (levelUpResult.leveledUp) {
      response += `\n\n🎉 **LEVEL UP!** You just reached Level ${levelUpResult.newLevel}! 🎉`;
    }
    
    await message.reply(response);
    // Clear current question so it can't be answered again
    currentQuestion.question = "";
    currentQuestion.answer = "";
    currentQuestion.messageId = null;
  } else {
    await message.reply("❌ That's not correct. Try again!");
  }
}

export async function getTriviaLeaderboard(): Promise<
  { userId: string; points: number }[]
> {
  const allPoints = await getAllPlayerPoints();
  return allPoints.sort((a, b) => b.points - a.points);
}
